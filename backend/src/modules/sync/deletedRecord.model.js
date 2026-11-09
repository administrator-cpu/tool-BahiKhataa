import mongoose from 'mongoose';

/**
 * Tombstone written whenever a record is permanently deleted, so read-only
 * sync clients (e.g. Ledgerly) can remove their copy. Exposed as the
 * `deletions` sync resource.
 */
const deletedRecordSchema = new mongoose.Schema({
  resource: {
    type: String,
    enum: ['ledgers', 'purchase-ledgers'],
    required: true
  },
  recordId: {
    type: mongoose.Schema.ObjectId,
    required: true
  },
  // Owner of the deleted entry, to help the client find it
  customer: { type: mongoose.Schema.ObjectId, ref: 'Customer', default: null },
  vendor: { type: mongoose.Schema.ObjectId, ref: 'Vendor', default: null },
  invoiceNo: { type: String, default: null },
  reason: {
    type: String,
    enum: ['user-delete', 'invoice-cancelled'],
    required: true
  },
  deletedBy: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
  deletedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

deletedRecordSchema.index({ updatedAt: 1, _id: 1 });
deletedRecordSchema.index({ resource: 1, recordId: 1 });

const DeletedRecord = mongoose.models.DeletedRecord || mongoose.model('DeletedRecord', deletedRecordSchema);

export default DeletedRecord;
