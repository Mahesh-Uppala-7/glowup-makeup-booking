import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export interface PickedImage {
  uri: string;
  name: string;
  type: string;
}

/* Opens the photo library and returns the chosen image, or null if cancelled. */
export async function pickImage(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Permission to access photos was denied');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.8,
  });

  if (result.canceled || result.assets.length === 0) return null;

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.fileName ?? `photo_${Date.now()}.jpg`,
    type: asset.mimeType ?? 'image/jpeg',
  };
}

/* Builds a multipart FormData body for uploading an image across web/native. */
export async function imageToFormData(image: PickedImage, caption?: string): Promise<FormData> {
  const form = new FormData();

  if (Platform.OS === 'web') {
    // On web the uri is a blob:/data: URL; fetch it to get a real Blob.
    const blob = await fetch(image.uri).then((r) => r.blob());
    form.append('image', blob, image.name);
  } else {
    // React Native accepts a { uri, name, type } object for file parts.
    form.append('image', {
      uri: image.uri,
      name: image.name,
      type: image.type,
    } as unknown as Blob);
  }

  if (caption) form.append('caption', caption);
  return form;
}
