import api from '@/lib/axios';

interface PresignResponse {
  url: string
  fields: Record<string, string>
  key: string
  publicUrl: string
}

export interface DocumentModel {
  id: string
  documentName: string
  fileUrl: string
  fileSizeBytes: number
  mimeType?: string | null
  uploadedById?: string | null
  createdAt: string
}

export async function requestPresignedUrl(fileName: string): Promise<PresignResponse> {
  const { data } = await api.post('/global-documents/presign', { fileName })
  return data
}

export async function confirmDocumentUpload(payload: {
  documentName: string
  fileUrl: string
  fileSizeBytes: number
  mimeType?: string
  entityType: 'site' | 'flat' | 'customer' | 'company' | 'vendor' | 'employee'
  entityId: string
}): Promise<DocumentModel> {
  const { data } = await api.post('/global-documents', payload)
  return data
}

export async function getEntityDocuments(entityType: string, entityId: string): Promise<DocumentModel[]> {
  const { data } = await api.get(`/global-documents/${entityType}/${entityId}`)
  return data
}

export async function deleteDocument(id: string): Promise<void> {
  await api.delete(`/global-documents/${id}`)
}

export async function uploadFileDirectlyToS3(file: File, presigned: PresignResponse) {
  const formData = new FormData()
  Object.entries(presigned.fields).forEach(([k, v]) => {
    formData.append(k, v)
  })
  formData.append('file', file)

  const response = await fetch(presigned.url, {
    method: 'POST',
    body: formData,
  })

  // Check if S3 rejected (like EntityTooLarge because of content-length-range constraint)
  if (!response.ok) {
    const text = await response.text()
    if (text.includes('EntityTooLarge')) {
      throw new Error('File exceeds the allowed 5MB limit.')
    }
    throw new Error('Failed to upload file to S3.')
  }
}