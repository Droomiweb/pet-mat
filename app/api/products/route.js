// app/api/products/route.js
import connectDB from "../../lib/mongodb";
import Product from "../../models/ProductModel";
import cloudinary from "../../lib/cloudinary";

// POST a new product (updated)
export async function POST(req) {
  try {
    await connectDB();
    const { name, description, price, images, ownerId, ownerName, contact, category } = await req.json();

    if (!name || !description || !price || !ownerId || !images.length || !category) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    // Upload images to Cloudinary
    const imageUrls = [];
    for (const base64Image of images) {
      // Pass the folder and a unique public ID to prevent overwrites
      const publicId = `products/${ownerId}/${Date.now()}`;
      const upload = await cloudinary.uploader.upload(base64Image, {
        folder: `products/${ownerId}`,
        public_id: publicId,
      });
      imageUrls.push(upload.secure_url);
    }

    const newProduct = new Product({
      name,
      description,
      price,
      images: imageUrls,
      ownerId,
      ownerName,
      contact,
      category
    });
    await newProduct.save();

    return new Response(JSON.stringify({ message: "Product added successfully!", product: newProduct }), { status: 201 });
  } catch (err) {
    console.error("Error adding product:", err);
    return new Response(JSON.stringify({ error: "Failed to add product" }), { status: 500 });
  }
}

// ... (GET method remains the same)

// ... (GET method remains the same)
// GET all products
export async function GET(req) {
  try {
    await connectDB();
    const products = await Product.find({}).lean();
    return new Response(JSON.stringify(products), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Error fetching products:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch products" }), { status: 500 });
  }
}