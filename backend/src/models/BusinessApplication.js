import mongoose from "mongoose";

const BusinessApplicationSchema = new mongoose.Schema(
  {
    // Account creation fields
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    phone: { type: String, required: true, trim: true, unique: true },
    password: { type: String, required: true, trim: true },
    
    // Profile and business setup fields
    fullName: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    businessType: { type: String, required: true, enum: ["rent", "shops", "society", "gym", "school"] },
    
    // Payout method fields (one is required)
    payoutMethod: { type: String, required: true, enum: ["upi", "bank"] },
    upiId: { type: String, trim: true },
    bankAccountNumber: { type: String, trim: true },
    bankIfsc: { type: String, trim: true, uppercase: true },
    
    // Status and verification
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    verificationMessage: { type: String, default: "Your account is under review and may take 24-48 hours for verification." },
    
    // Legacy fields for compatibility
    businessName: { type: String, trim: true },
    contactName: { type: String, trim: true },
    bankAccountMasked: { type: String, trim: true },
    ifsc: { type: String, trim: true, uppercase: true },
    notes: { type: String, default: "" },
    licenseId: { type: mongoose.Schema.Types.ObjectId, ref: "License", default: null },
  },
  { timestamps: true }
);

BusinessApplicationSchema.index({ email: 1, status: 1 });

export default mongoose.model("BusinessApplication", BusinessApplicationSchema);

