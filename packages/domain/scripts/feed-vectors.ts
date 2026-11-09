// The server parser is the reference implementation for Standalone Devices (ADR 0012).
import { readFileSync } from "node:fs"
import { parseDuration, parseFeed } from "../../server/src/FeedParser.ts"

const rss = (body: string) =>
  `<rss xmlns:itunes="urn:itunes" xmlns:content="urn:content" xmlns:podcast="urn:podcast"><channel>${body}</channel></rss>`
const sources = [
  {
    name: "publisher-fields",
    xml: readFileSync(
      new URL("../../server/test/fixtures/night-shift.xml", import.meta.url),
      "utf8"
    )
  },
  {
    name: "fallbacks-and-escaping",
    xml: rss(`<title> Fish &amp; Chips </title><itunes:owner>Owner</itunes:owner><itunes:summary>Summary</itunes:summary><image><url>https://test/image</url></image>
    <item><itunes:title>iTunes title</itunes:title><itunes:summary>Item summary</itunes:summary><pubDate>2026-11-09T12:34:56Z</pubDate><itunes:duration>1:00:00.5</itunes:duration><enclosure url="https://test/a?x=1&amp;y=2"/></item>
    <item><guid>  explicit </guid><title/><description/><enclosure url="https://test/b"/><pubDate>bad date</pubDate><itunes:duration>soon</itunes:duration></item>
    <item><title>No enclosure</title></item><item><enclosure url=""/></item>`)
  },
  { name: "empty-channel", xml: rss("<title>Empty</title>") },
  {
    name: "nested-text-and-publisher-dates",
    xml: rss(`<title>Show</title><itunes:owner><itunes:name>Not direct text</itunes:name></itunes:owner>
      <item><title> Hello <b>ignored markup</b> world </title><enclosure url="https://test/date1"/><pubDate>Tue, 09 Nov 2026 04:05:06 GMT</pubDate></item>
      <item><enclosure url="https://test/date2"/><pubDate>09 Nov 26 04:05:06 +0000</pubDate></item>
      <item><enclosure url="https://test/date3"/><pubDate>2026-11-09</pubDate></item>`)
  },
  {
    name: "description-priority",
    xml: rss(`<title>Podcast</title><itunes:author>Author</itunes:author><itunes:owner>Ignored</itunes:owner><description>Description</description><itunes:summary>Ignored</itunes:summary><itunes:image href="https://test/itunes"/><image><url>https://test/ignored</url></image>
    <item><title>First</title><itunes:title>Ignored</itunes:title><content:encoded><![CDATA[<p>Show notes & details</p>]]></content:encoded><description>Ignored</description><enclosure url="https://test/c"/><enclosure url="https://test/ignored"/><pubDate>Mon, 09 Nov 2026 04:05:06 +0000</pubDate><itunes:duration>60:00</itunes:duration></item>`)
  }
]
const rejected = [
  { name: "not-rss", xml: "<html><body/></html>" },
  { name: "missing-channel", xml: "<rss/>" },
  { name: "missing-title", xml: rss("<description>No title</description>") },
  { name: "empty-title", xml: rss("<title> </title>") }
]
// Stricter on the Device than the server, whose tolerant parser keeps sloppy live feeds working.
const rejectedOnDevice = [
  { name: "malformed", xml: "<rss><channel><title>Broken</channel></rss>" },
  {
    name: "external-entity",
    xml: '<!DOCTYPE rss [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><rss><channel><title>&xxe;</title></channel></rss>'
  },
  {
    name: "external-dtd",
    xml: '<!DOCTYPE rss SYSTEM "https://test/evil"><rss><channel><title>Unsafe</title></channel></rss>'
  }
]
export const buildFeedVectors = () => ({
  protocolVersion: 4,
  feeds: [
    ...sources.map((source) => ({ ...source, expected: parseFeed(source.xml) })),
    ...rejected.map((source) => ({ ...source, error: true })),
    ...rejectedOnDevice.map((source) => ({ ...source, error: true, deviceOnly: true }))
  ],
  durations: [
    null,
    "3600",
    "60:00",
    "1:00:00",
    "1:00:00.5",
    "0",
    "0.25",
    "1:2",
    "1:2:3:4",
    "soon",
    "-1",
    "NaN",
    "Infinity",
    "",
    " ",
    "1::2"
  ].map((input) => ({ input, expected: parseDuration(input) }))
})
