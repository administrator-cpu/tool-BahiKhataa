import DeletedRecord from './deletedRecord.model.js';

/**
 * Permanently deletes a ledger document and records a tombstone for sync clients.
 * The tombstone is written first; if the delete then fails it is removed again,
 * so a tombstone always means the record is really gone.
 *
 * @param {mongoose.Model} Model - Ledger or PurchaseLedger
 * @param {Document} doc - the document being deleted
 * @param {Object} meta - { resource, reason, deletedBy }
 */
export const deleteWithTombstone = async (Model, doc, { resource, reason, deletedBy = null }) => {
  const tombstone = await DeletedRecord.create({
    resource,
    recordId: doc._id,
    customer: doc.customer || null,
    vendor: doc.vendor || null,
    invoiceNo: doc.invoiceNo || null,
    reason,
    deletedBy
  });

  try {
    await Model.findByIdAndDelete(doc._id);
  } catch (err) {
    await DeletedRecord.findByIdAndDelete(tombstone._id).catch(() => {});
    throw err;
  }
};
