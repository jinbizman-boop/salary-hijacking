export type UploadScanStatus = "PENDING" | "PASSED" | "FAILED" | "SKIPPED";
export type UploadStatus =
  | "PREPARED"
  | "UPLOADING"
  | "UPLOADED"
  | "SCANNING"
  | "AVAILABLE"
  | "QUARANTINED"
  | "DELETED";

export type UploadAttachment = Readonly<{
  attachmentId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  scanStatus: UploadScanStatus;
  status: UploadStatus;
}>;

export type DirectCommunityAttachmentUpload = Readonly<{
  bytes: ArrayBuffer;
  contentType: string;
  fileName: string;
  sizeBytes: number;
}>;

export type DirectVariableExpenseReceiptUpload =
  DirectCommunityAttachmentUpload;

export type UploadsApiClient = Readonly<{
  directUploadCommunityAttachment: (
    input: DirectCommunityAttachmentUpload,
  ) => Promise<UploadAttachment>;
  directUploadVariableExpenseReceipt: (
    input: DirectVariableExpenseReceiptUpload,
  ) => Promise<UploadAttachment>;
  attachToCommunityPost: (
    attachmentId: string,
    postId: string,
  ) => Promise<Readonly<{ attachmentId: string }>>;
  attachToVariableExpense: (
    attachmentId: string,
    expenseId: string,
  ) => Promise<Readonly<{ attachmentId: string }>>;
}>;
