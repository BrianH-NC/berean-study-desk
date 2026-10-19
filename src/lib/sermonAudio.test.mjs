import test from 'node:test'
import assert from 'node:assert/strict'
import { sermonAudioLink } from './sermonAudio.js'
import { sourceType } from './sermonModel.js'
test('SermonAudio modern, legacy and embed links resolve to a trusted audio player', () => {
  for (const url of ['https://www.sermonaudio.com/sermons/421181554360', 'https://web.sermonaudio.com/sermons/421181554360/?foo=bar', 'http://sermonaudio.com/sermoninfo.asp?SID=421181554360', 'https://embed.sermonaudio.com/player/v/421181554360/']) {
    assert.equal(sermonAudioLink(url)?.embedUrl, 'https://embed.sermonaudio.com/player/a/421181554360/')
    assert.equal(sourceType(url), 'audio')
  }
})
test('Only supported sermon URLs may become embedded players', () => {
  for (const url of ['', null, 'javascript:alert(1)', 'https://sermonaudio.com.evil.test/sermons/421181554360', 'https://evil.test/sermons/421181554360', 'https://user@sermonaudio.com/sermons/421181554360', 'https://sermonaudio.com:9000/sermons/421181554360', 'https://sermonaudio.com/sermoninfo.asp?SID=abc', 'https://sermonaudio.com/sermons/421181554360/extra', 'https://sermonaudio.com/broadcasters/faith']) assert.equal(sermonAudioLink(url), null, String(url))
})
test('Existing source classification is preserved', () => {
  assert.equal(sourceType('https://youtu.be/example'), 'youtube')
  assert.equal(sourceType('https://example.com/sermon.mp3'), 'audio')
  assert.equal(sourceType('https://example.com/sermon.mp4'), 'video')
  assert.equal(sourceType(''), 'text')
})
