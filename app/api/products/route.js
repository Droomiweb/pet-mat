// app/api/products/route.js

// 1. IMPORTS
import connectDB from "../../lib/mongodb";
import Product from "../../models/ProductModel";
import cloudinary from "../../lib/cloudinary";

// 2. POST HANDLER (Create New Product)
export async function POST(req) {
  try {
    await connectDB();
    
    // Parse the incoming product data
    const { name, description, price, images, ownerId, ownerName, contact, category } = await req.json();

    // 3. VALIDATION
    // Ensure all critical fields are present before attempting upload
    if (!name || !description || !price || !ownerId || !images || !images.length || !category) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    // 4. IMAGE UPLOAD LOOP
    // We expect an array of Base64 image strings. We upload them one by one.
    const imageUrls = [];
    
    for (const base64Image of images) {
      // Create a unique file name to prevent overwriting
      const uniqueSuffix = Date.now(); 
      
      const upload = await cloudinary.uploader.upload(base64Image, {
        folder: `products/${ownerId}`, // Organize by User ID
        public_id: `product_${uniqueSuffix}`, 
        resource_type: "image"
      });
      
      imageUrls.push(upload.secure_url);
    }

    // 5. CREATE DATABASE DOCUMENT
    const newProduct = new Product({
      name,
      description,
      price,
      images: imageUrls, // Store the array of Cloudinary URLs
      ownerId,
      ownerName,
      contact,
      category, // Important for marketplace filtering
      createdAt: new Date()
    });

    await newProduct.save();

    // 6. SUCCESS RESPONSE
    return new Response(JSON.stringify({ message: "Product added successfully!", product: newProduct }), { status: 201 });

  } catch (err) {
    console.error("Error adding product:", err);
    return new Response(JSON.stringify({ error: "Failed to add product" }), { status: 500 });
  }
}

// 7. GET HANDLER (Fetch All Products)
export async function GET(req) {
  try {
    await connectDB();
    
    // Fetch all products, sorted by newest first
    // .lean() is used for performance as we don't need Mongoose instance methods here
    const products = await Product.find({})
      .sort({ createdAt: -1 })
      .lean();
      
    return new Response(JSON.stringify(products), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (err) {
    console.error("Error fetching products:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch products" }), { status: 500 });
  }
}