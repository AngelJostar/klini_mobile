import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { resolveKliniAiConnection } from '../domain/kliniAiConnection';
import { createKliniAiService, type AskKliniAiInput } from './kliniAi';
import { prepareAiRecordAttachment } from './aiAttachments';

export async function askKliniAi(input: AskKliniAiInput) {
  const development = typeof __DEV__ !== 'undefined' && __DEV__;
  const connection = resolveKliniAiConnection({
    endpoint: process.env.EXPO_PUBLIC_KLINI_AI_URL,
    development,
    platform: Platform.OS,
    expoHostUri: Constants.expoConfig?.hostUri,
  });
  return createKliniAiService({ ...connection, development, readRecordAttachment: prepareAiRecordAttachment, developmentToken: development ? process.env.EXPO_PUBLIC_KLINI_AI_DEV_TOKEN : undefined })(input);
}
