import mongoose from "mongoose";

const ClusterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    businessApplicationId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "BusinessApplication", 
      required: true 
    },
    customerCount: { type: Number, default: 0 },
    paidCount: { type: Number, default: 0 },
    pendingCount: { type: Number, default: 0 },
    status: { 
      type: String, 
      enum: ["active", "inactive"], 
      default: "active" 
    },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ClusterSchema.index({ businessApplicationId: 1, status: 1 });

export default mongoose.model("Cluster", ClusterSchema);
