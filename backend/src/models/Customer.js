import mongoose from "mongoose";

const CustomerSchema = new mongoose.Schema(
  {
    licenseId: { type: mongoose.Schema.Types.ObjectId, ref: "License", required: true, index: true },
    clusterId: { type: mongoose.Schema.Types.ObjectId, ref: "Cluster", default: null },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    dueDate: { type: String, required: true }, // ISO date: YYYY-MM-DD
    paidAt: { type: String, default: null }, // ISO date: YYYY-MM-DD
    status: { type: String, enum: ["pending", "paid", "overdue"], default: "pending" },
  },
  { timestamps: true }
);

export default mongoose.model("Customer", CustomerSchema);

