const CLOUD_NAME = 'dyp5xdhrj';
const UPLOAD_PRESET = 'poubcoin_uploads';
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

export async function uploadImageToCloudinary(imageUri: string | undefined): Promise<string | null> {
  if (!imageUri) return null;
  // Already a remote URL — no upload needed
  if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) return imageUri;

  const formData = new FormData();
  formData.append('upload_preset', UPLOAD_PRESET);

  if (imageUri.startsWith('data:')) {
    formData.append('file', imageUri);
  } else {
    // bare base64 — add data URI prefix (assume jpeg)
    formData.append('file', `data:image/jpeg;base64,${imageUri}`);
  }

  const res = await fetch(UPLOAD_URL, { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cloudinary upload failed: ${err}`);
  }
  const json = await res.json();
  return json.secure_url as string;
}
