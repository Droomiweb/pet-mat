// app/api/products/route.js

// Standard imports
import connectDB from "../../lib/mongodb";
import Product from "../../models/ProductModel";
import cloudinary from "../../lib/cloudinary";

// POST request handler
export async function POST(req) {
  try {
    await connectDB();
    
    // Parse product data
    const { name, description, price, images, ownerId, ownerName, contact, category } = await req.json();

    // Validate required fields
    if (!name || !description || !price || !ownerId || !images || !images.length || !category) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    // Upload product images
    const imageUrls = [];
    
    for (const base64Image of images) {
      // Generate unique filename
      const uniqueSuffix = Date.now(); 
      
      const upload = await cloudinary.uploader.upload(base64Image, {
        folder: `products/${ownerId}`, // Organize by user
        public_id: `product_${uniqueSuffix}`, 
        resource_type: "image"
      });
      
      imageUrls.push(upload.secure_url);
    }

    // Create product document
    const newProduct = new Product({
      name,
      description,
      price,
      images: imageUrls, // Save image URLs
      ownerId,
      ownerName,
      contact,
      category, 
      createdAt: new Date()
    });

    await newProduct.save();

    // Return success response
    return new Response(JSON.stringify({ message: "Product added successfully!", product: newProduct }), { status: 201 });

  } catch (err) {
    console.error("Error adding product:", err);
    return new Response(JSON.stringify({ error: "Failed to add product" }), { status: 500 });
  }
}

// GET request handler
export async function GET(req) {
  try {
    await connectDB();
    
    // Fetch sorted products
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