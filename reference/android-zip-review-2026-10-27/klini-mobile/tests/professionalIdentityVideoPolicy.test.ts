import test from 'node:test';
import assert from 'node:assert/strict';
import { isOwnedProfessionalIdentityCapture, isOwnedProfessionalIdentityVideo, isProfessionalWebVideoSource, professionalVideoMime } from '../src/services/professionalIdentityVideoPolicy';

const documents = 'file:///private/app/Documents/professional-identity';
const cache = 'file:///private/app/Library/Caches/';
const ownedName = 'Professional-identity-1794254400000-abcdefgh12.mp4';
const cameraName = 'a2e68a9d-7074-41c2-9cf0-d4d815f3019e.mov';

test('video MIME normalization accepts recorder codec parameters without expanding allowed media types', () => {
  assert.equal(professionalVideoMime('video/webm;codecs=vp8,opus'), 'video/webm');
  assert.equal(professionalVideoMime('Video/MP4'), 'video/mp4');
  assert.equal(professionalVideoMime('video/quicktime'), 'video/quicktime');
  for (const value of ['', 'image/jpeg', 'application/pdf', 'video/avi', 'text/html']) assert.throws(() => professionalVideoMime(value));
});

test('web recordings can use an app-owned blob or video data URL but never a remote resource', () => {
  const origin = 'https://klini.example';
  assert.equal(isProfessionalWebVideoSource('blob:https://klini.example/a-local-blob', origin), true);
  assert.equal(isProfessionalWebVideoSource('data:video/webm;base64,AQIDBA==', origin), true);
  assert.equal(isProfessionalWebVideoSource('data:video/mp4;base64,AQIDBA==', origin), true);
  for (const uri of ['https://klini.example/video.mp4', 'http://localhost/video.mp4', 'blob:https://other.example/clip', 'file:///some/video.mp4', 'content://camera/clip', 'javascript:alert(1)', 'data:text/html;base64,AQIDBA==', 'data:video/mp4;base64,']) {
    assert.equal(isProfessionalWebVideoSource(uri, origin), false, uri);
  }
  assert.equal(isProfessionalWebVideoSource('blob:null/random', 'null'), false);
});

test('saved-video cleanup admits only generated direct children of this private feature folder', () => {
  assert.equal(isOwnedProfessionalIdentityVideo(`${documents}/${ownedName}`, documents), true);
  assert.equal(isOwnedProfessionalIdentityVideo(`${documents}/${ownedName.replace('.mp4', '.webm')}`, `${documents}/`), true);
  assert.equal(isOwnedProfessionalIdentityVideo(`${documents}/${ownedName.replace('.mp4', '.mov')}`, documents), true);
  for (const uri of [
    `https://klini.example/${ownedName}`,
    `${documents}-other/${ownedName}`,
    `${documents}/nested/${ownedName}`,
    `${documents}/../${ownedName}`,
    `${documents}/%2e%2e/${ownedName}`,
    `${documents}/%252e%252e/${ownedName}`,
    `${documents}/${ownedName}?other=1`,
    `${documents}/${ownedName}#fragment`,
    `${documents}/user-recording.mp4`,
    `${documents}/${ownedName.replace('.mp4', '.pdf')}`,
    `file:///another-app/Documents/professional-identity/${ownedName}`,
  ]) assert.equal(isOwnedProfessionalIdentityVideo(uri, documents), false, uri);
});

test('temporary cleanup is restricted to UUID-named video captures in the app camera cache', () => {
  assert.equal(isOwnedProfessionalIdentityCapture(`${cache}Camera/${cameraName}`, cache), true);
  assert.equal(isOwnedProfessionalIdentityCapture(`${cache}Camera/${cameraName.toUpperCase()}`, cache), true);
  for (const uri of [
    `${cache}Camera/${cameraName.replace('.mov', '.jpg')}`,
    `${cache}Camera/not-a-camera-capture.mov`,
    `${cache}Camera/subdirectory/${cameraName}`,
    `${cache}Camera/../${cameraName}`,
    `${cache}Camera/%2e%2e/${cameraName}`,
    `${cache}AnotherFeature/${cameraName}`,
    `${documents}/${cameraName}`,
    `file:///another-app/Library/Caches/Camera/${cameraName}`,
    `https://klini.example/Camera/${cameraName}`,
    `${cache}Camera/${cameraName}?override=true`,
  ]) assert.equal(isOwnedProfessionalIdentityCapture(uri, cache), false, uri);
});
