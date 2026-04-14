import mongoose from "mongoose";

const LicenseSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    businessName: { type: String, required: true, trim: true },
    contactName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    bankAccountMasked: { type: String, required: true, trim: true },
    ifsc: { type: String, required: true, trim: true, uppercase: true },
    active: { type: Boolean, default: true },
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("License", LicenseSchema);

