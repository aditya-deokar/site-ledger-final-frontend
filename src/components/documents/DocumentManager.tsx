"use client"

import { useState, useEffect } from 'react'
import { PlusIcon, FileIcon, TrashIcon, DownloadIcon, EyeIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DocumentModel,
  confirmDocumentUpload,
  fetchDocumentBlob,
  deleteDocument,
  getEntityDocuments,
  requestPresignedUrl,
  uploadFileDirectlyToS3,
} from '@/services/document.service'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export function DocumentManager({
  entityType,
  entityId,
}: {
  entityType: 'site' | 'flat' | 'customer' | 'company' | 'vendor' | 'employee'
  entityId: string
}) {
  const [documents, setDocuments] = useState<DocumentModel[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [documentName, setDocumentName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDocuments()
  }, [entityType, entityId])

  async function fetchDocuments() {
    try {
      setLoading(true)
      const data = await getEntityDocuments(entityType, entityId)
      setDocuments(data || [])
    } catch (err) {
      console.error('Failed to fetch documents', err)
    } finally {
      setLoading(false)
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null)
    const selected = e.target.files?.[0]
    if (!selected) return

    if (selected.size > MAX_FILE_SIZE) {
      setError('File size must be 5MB or smaller')
      setFile(null)
      e.target.value = ''
      return
    }

    setFile(selected)
    if (!documentName) {
      const nameWithoutExt = selected.name.replace(/\.[^/.]+$/, '')
      setDocumentName(nameWithoutExt)
    }
  }

  async function handleUpload() {
    if (!file) return

    try {
      setUploading(true)
      setError(null)

      // 1. Get presigned URL
      const presigned = await requestPresignedUrl(file.name)

      // 2. Upload to S3
      await uploadFileDirectlyToS3(file, presigned)

      // 3. Confirm with backend
      const newDoc = await confirmDocumentUpload({
        documentName: documentName || file.name,
        fileUrl: presigned.publicUrl,
        fileSizeBytes: file.size,
        mimeType: file.type,
        entityType,
        entityId,
      })

      setDocuments((prev) => [newDoc, ...prev])
      setIsDialogOpen(false)
      setFile(null)
      setDocumentName('')
    } catch (err: any) {
      if (err.response?.status === 402) {
        setError('Storage limit exceeded. Allowed: 500MB')
      } else {
        setError(err.message || 'Failed to upload document')
      }
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this document?')) return
    try {
      await deleteDocument(id)
      setDocuments((prev) => prev.filter((d) => d.id !== id))
    } catch (err) {
      console.error(err)
      alert('Failed to delete document')
    }
  }

  async function handleViewDocument(doc: DocumentModel) {
    try {
      setError(null)
      const fileBlob = await fetchDocumentBlob(doc.fileUrl)
      const previewBlob = doc.mimeType && fileBlob.type !== doc.mimeType
        ? new Blob([fileBlob], { type: doc.mimeType })
        : fileBlob
      const objectUrl = URL.createObjectURL(previewBlob)
      window.open(objectUrl, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
    } catch (err) {
      console.error('Failed to open document', err)
      setError('Failed to open document preview.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Documents</h3>
        <Button onClick={() => setIsDialogOpen(true)} size="sm">
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Document
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[150px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4">
                  Loading...
                </TableCell>
              </TableRow>
            ) : documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                  No documents found.
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium align-middle">
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <FileIcon className="w-4 h-4" />
                      {doc.documentName}
                    </a>
                  </TableCell>
                  <TableCell className="align-middle">
                    {(doc.fileSizeBytes / 1024 / 1024).toFixed(2)} MB
                  </TableCell>
                  <TableCell className="align-middle text-muted-foreground">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right align-middle">
                    <div className="flex justify-end gap-1">
                      {(doc.mimeType?.startsWith('image/') || doc.mimeType === 'application/pdf') && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          title="View Document"
                          onClick={() => handleViewDocument(doc)}
                        >
                          <EyeIcon className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Download Document"
                        onClick={() => {
                          const a = document.createElement('a')
                          a.href = doc.fileUrl
                          a.download = doc.documentName
                          document.body.appendChild(a)
                          a.click()
                          document.body.removeChild(a)
                        }}
                      >
                        <DownloadIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(doc.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        title="Delete Document"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>

          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md border border-red-200">
              {error}
            </div>
          )}

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="file">Select File (Max 5MB)</Label>
              <Input
                id="file"
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Document Name</Label>
              <Input
                id="name"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="Enter document name"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false)
                setError(null)
                setFile(null)
                setDocumentName('')
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!file || !documentName || uploading}>
              {uploading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
