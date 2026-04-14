import mongoose from "mongoose";

const BusinessApplicationSchema = new mongoose.Schema(
  {
    businessName: { type: String, required: true, trim: true },
    contactName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    bankAccountMasked: { type: String, required: true, trim: true },
    ifsc: { type: String, required: true, trim: true, uppercase: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    notes: { type: String, default: "" },
    licenseId: { type: mongoose.Schema.Types.ObjectId, ref: "License", default: null },
  },
  { timestamps: true }
);

BusinessApplicationSchema.index({ email: 1, status: 1 });

export default mongoose.model("BusinessApplication", BusinessApplicationSchema);

