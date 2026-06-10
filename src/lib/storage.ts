// Storage upload helpers. All Firebase calls live outside components (CLAUDE.md architecture).
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from './firebase'

const MAX_PHOTO_MB = 8
const MAX_VIDEO_MB = 60

function ext(file: File): string {
  const m = file.name.match(/\.([a-z0-9]+)$/i)
  return m ? m[1].toLowerCase() : 'bin'
}

export async function uploadProfilePhoto(uid: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')
  if (file.size > MAX_PHOTO_MB * 1024 * 1024) throw new Error(`Image must be under ${MAX_PHOTO_MB} MB.`)
  const r = ref(storage, `profile-photos/${uid}/photo.${ext(file)}`)
  await uploadBytes(r, file, { contentType: file.type })
  return getDownloadURL(r)
}

export async function uploadIntroVideo(uid: string, file: File): Promise<string> {
  if (!file.type.startsWith('video/')) throw new Error('Please choose a video file.')
  if (file.size > MAX_VIDEO_MB * 1024 * 1024)
    throw new Error(`Video must be under ${MAX_VIDEO_MB} MB (about one minute).`)
  const r = ref(storage, `intro-videos/${uid}/intro.${ext(file)}`)
  await uploadBytes(r, file, { contentType: file.type })
  return getDownloadURL(r)
}
