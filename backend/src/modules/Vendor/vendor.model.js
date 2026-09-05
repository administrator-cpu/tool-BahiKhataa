import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: [true, "Please enter the vendor/company name"],
    trim: true,
    uppercase: true,
    unique: true
  },
  address: {
    type: String,
    required: [true, "Please enter the address"],
    trim: true,
    uppercase: true
  },
  gstNumber: {
    type: String,
    uppercase: true,
    trim: true,
  },
  panNumber: {
    type: String,
    trim: true,
    uppercase: true,
    match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please provide a valid PAN number format (e.g., ABCDE1234F)']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  manager: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
  },
  availableAdvance: {
    type: Number,
    default: 0
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true
});

vendorSchema.index({ manager: 1 });
const Vendor = mongoose.models.Vendor || mongoose.model('Vendor', vendorSchema);

export default Vendor;