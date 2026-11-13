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
  { name: "truncated-title", xml: "<rss><channel><title>unfinished" },
  { name: "unclosed-opening-tag", xml: "<rss><channel><title>Show</title><item" },
  { name: "unclosed-attribute", xml: '<rss><channel><title>Show</title><item><enclosure url="a' },
  { name: "unclosed-comment", xml: rss("<title>Show</title><!--") },
  { name: "unclosed-cdata", xml: rss("<title>Show</title><![CDATA[bad") },
  { name: "unclosed-doctype", xml: '<!DOCTYPE rss [<!ENTITY custom "x">' },
  {
    name: "excessive-nesting",
    xml: rss(`<title>Show</title>${"<nested>".repeat(200)}${"</nested>".repeat(200)}`)
  },
  { name: "not-rss", xml: "<html><body/></html>" },
  { name: "missing-channel", xml: "<rss/>" },
  { name: "missing-title", xml: rss("<description>No title</description>") },
  { name: "empty-title", xml: rss("<title> </title>") }
]
const recovered = [
  {
    name: "ignored-entity-expansion-bomb",
    xml: `<!DOCTYPE rss [<!ENTITY lol0 "EXPANDED">${Array.from({ length: 9 }, (_, n) => `<!ENTITY lol${n + 1} "${`&lol${n};`.repeat(10)}">`).join("")}]>${rss('<title>&lol9;</title><item><enclosure url="&lol9;"/></item>')}`
  },
  {
    name: "declaration-literals",
    xml: rss(
      '<title><![CDATA[<!DOCTYPE literal> &amp;]]></title><!-- <!DOCTYPE fake [ --><item><enclosure url="https://test/<!DOCTYPE literal>"/></item>'
    )
  },

  { name: "malformed", xml: "<rss><channel><title>Broken</channel></rss>" },
  {
    name: "external-entity",
    xml: '<!DOCTYPE rss [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><rss><channel><title>&xxe;</title></channel></rss>'
  },
  {
    name: "external-dtd",
    xml: '<!DOCTYPE rss SYSTEM "https://test/evil"><rss><channel><title>Unsafe</title></channel></rss>'
  },
  {
    name: "bare-ampersands",
    xml: rss(
      '<title>Fish & Chips &unknown;</title><item><title>A & B</title><enclosure url="https://test/a?x=1&y=2"/></item>'
    )
  },
  {
    name: "unbound-prefixes",
    xml: '<rss><channel><title>Show</title><itunes:author>Author</itunes:author><item><itunes:title>Episode</itunes:title><enclosure url="a"/></item></channel></rss>'
  },
  {
    name: "truncated-after-complete-fields",
    xml: '<rss><channel><title>Show</title><item><title>Episode</title><enclosure url="a"/>'
  },
  {
    name: "truncated-final-text",
    xml: '<rss><channel><title>Show</title><item><enclosure url="a"/><description>unfinished'
  },
  {
    name: "mismatched-item-close",
    xml: rss(
      '<title>Show</title><item><title>Episode</wrong><enclosure url="a"/></oops><item><enclosure url="b"/></item>'
    )
  },
  {
    name: "stray-closing-tag",
    xml: `</stray>${rss('<title>Show</title><item><enclosure url="a"/></item>')}`
  },
  {
    name: "quoted-and-unquoted-attributes",
    xml: rss(
      '<title>Show</title><item><enclosure url=ignored/></item><item><enclosure url="old" url="new" note="x > y"/></item>'
    )
  },
  {
    name: "built-in-entities",
    xml: rss(
      '<title>&lt; &gt; &amp; &quot; &apos; &#65; &#x1F600; &nbsp; &copy; &mdash; &euro;</title><item><enclosure url="a?x=&#49;&amp;y=&copy;"/></item>'
    )
  },
  {
    name: "entity-decoding-once",
    xml: rss(
      "<title>&amp;lt; &unknown; &#x110000; &#0; &#xD800;</title><description><![CDATA[&copy; &amp; <!DOCTYPE literal>]]></description>"
    )
  },
  {
    name: "comments-and-cdata",
    xml: rss(
      "<title>A<!-- ignored --> B<![CDATA[ C &amp; ]]></title><description>one<b>ignored</b>two</description>"
    )
  },
  {
    name: "ignored-internal-entities",
    xml:
      '<!DOCTYPE rss [<!ENTITY custom "EXPANDED"><!ENTITY amp "WRONG">]>' +
      rss('<title>&custom; &amp; &#65; &copy;</title><item><enclosure url="&custom;"/></item>')
  },
  {
    name: "ignored-parameter-entity",
    xml:
      '<!DOCTYPE rss [<!ENTITY % remote SYSTEM "https://test/evil">%remote;]>' +
      rss("<title>Safe</title>")
  },
  {
    name: "doctype-quotes-and-comments",
    xml:
      '<!DOCTYPE rss SYSTEM "https://test/a>b" [<!-- ]> fake <rss> --><!ENTITY custom "x ]> <title>Injected</title>">]>' +
      rss("<title>Safe &custom;</title>")
  }
]
export const buildFeedVectors = () => ({
  protocolVersion: 4,
  feeds: [
    ...[...sources, ...recovered].map((source) => ({ ...source, expected: parseFeed(source.xml) })),
    ...rejected.map((source) => ({ ...source, error: true }))
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
