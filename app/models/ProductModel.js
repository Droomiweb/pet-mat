// app/models/ProductModel.js
import mongoose from "mongoose";

// Define the schema for marketplace products
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  images: [{ type: String }], // Array of Cloudinary image URLs
  ownerId: { type: String, required: true },
  ownerName: { type: String, required: true },
  contact: { type: String }, // Contact info, e.g., email or phone
  category: { type: String, required: true },
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
export default Product;