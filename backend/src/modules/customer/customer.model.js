import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: [true, "Please enter the company name"],
    trim: true
  },
  address: {
    type: String,
    required: [true, "Please enter the address"],
    trim: true
  },
  gstNumber: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    trim: true,
  },
  manager: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    // required: [true, "Customer must be assigned to an Employee"]
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
})

customerSchema.index({ manager: 1 });

const Customer = mongoose.model('Customer', customerSchema);

export default Customer;