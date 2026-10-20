import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { sharePortalCalendar } from '../portal-calendar';

const mockFile = { create: jest.fn(), write: jest.fn(), delete: jest.fn(), exists: true, uri: 'file:///cache/cita.ics' };

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => mockFile),
  Paths: { cache: 'file:///cache' },
}));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(true);
  jest.mocked(Sharing.shareAsync).mockResolvedValue(undefined);
});

test('rejects unexpected messages, oversized payloads and invalid base64 without writing files', async () => {
  for (const message of [
    { type: 'other', base64: 'YWJj' },
    { type: 'klini.calendar', base64: '../private' },
    { type: 'klini.calendar', base64: 'a'.repeat(1_400_001) },
  ]) await sharePortalCalendar(JSON.stringify(message));
  expect(File).not.toHaveBeenCalled();
  expect(Sharing.shareAsync).not.toHaveBeenCalled();
});

test('uses a generated cache filename instead of a filename supplied by the page', async () => {
  await sharePortalCalendar(JSON.stringify({ type: 'klini.calendar', base64: 'YWJj', name: '../../private' }));
  expect(File).toHaveBeenCalledWith('file:///cache', expect.stringMatching(/^cita-medica-\d+\.ics$/));
  expect(Sharing.shareAsync).toHaveBeenCalledWith(mockFile.uri, expect.objectContaining({ mimeType: 'text/calendar' }));
  expect(mockFile.delete).toHaveBeenCalled();
});

test('removes the temporary file when the native share operation fails', async () => {
  jest.mocked(Sharing.shareAsync).mockRejectedValue(new Error('share failed'));
  await expect(sharePortalCalendar(JSON.stringify({ type: 'klini.calendar', base64: 'YWJj' }))).rejects.toThrow('share failed');
  expect(mockFile.delete).toHaveBeenCalled();
});

test('does not write a calendar when native sharing is unavailable', async () => {
  jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(false);
  await expect(sharePortalCalendar(JSON.stringify({ type: 'klini.calendar', base64: 'YWJj' }))).rejects.toThrow();
  expect(File).not.toHaveBeenCalled();
});
