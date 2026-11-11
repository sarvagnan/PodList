import AVFoundation
import MediaToolbox

/// +6 dB with a peak limiter. The audio render callback owns its tiny format flag, avoiding
/// actor hops, locks, allocations and shared mutable UI state on the real-time audio thread.
@MainActor enum VolumeBoost {
    static func attach(to item: AVPlayerItem) async {
        guard let tracks = try? await item.asset.loadTracks(withMediaType: .audio) else { return }
        let mix = AVMutableAudioMix()
        mix.inputParameters = tracks.compactMap { track in
            var callbacks = MTAudioProcessingTapCallbacks(version: kMTAudioProcessingTapCallbacksVersion_0, clientInfo: nil,
                init: { _, _, storage in
                    let flag = UnsafeMutablePointer<Bool>.allocate(capacity: 1)
                    flag.initialize(to: false); storage.pointee = UnsafeMutableRawPointer(flag)
                }, finalize: { tap in
                    let flag = MTAudioProcessingTapGetStorage(tap).assumingMemoryBound(to: Bool.self)
                    flag.deinitialize(count: 1); flag.deallocate()
                }, prepare: { tap, _, format in
                    MTAudioProcessingTapGetStorage(tap).assumingMemoryBound(to: Bool.self).pointee =
                        format.pointee.mFormatID == kAudioFormatLinearPCM &&
                        format.pointee.mFormatFlags & kAudioFormatFlagIsFloat != 0 && format.pointee.mBitsPerChannel == 32
                }, unprepare: { _ in }, process: { tap, frames, _, buffers, framesOut, flags in
                    guard MTAudioProcessingTapGetSourceAudio(tap, frames, buffers, flags, nil, framesOut) == noErr,
                          MTAudioProcessingTapGetStorage(tap).assumingMemoryBound(to: Bool.self).pointee else { return }
                    for buffer in UnsafeMutableAudioBufferListPointer(buffers) {
                        guard let data = buffer.mData else { continue }
                        let samples = data.assumingMemoryBound(to: Float.self)
                        for i in 0..<(Int(buffer.mDataByteSize) / MemoryLayout<Float>.size) {
                            samples[i] = min(1, max(-1, samples[i] * 1.9952623))
                        }
                    }
                })
            var tap: MTAudioProcessingTap?
            guard MTAudioProcessingTapCreate(kCFAllocatorDefault, &callbacks, kMTAudioProcessingTapCreationFlag_PostEffects, &tap) == noErr,
                  let tap else { return nil }
            let parameters = AVMutableAudioMixInputParameters(track: track)
            parameters.audioTapProcessor = tap
            return parameters
        }
        item.audioMix = mix
    }
}
