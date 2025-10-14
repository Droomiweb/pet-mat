// app/Add-product/page.js
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../lib/firebase";

export default function AddProductPage() {
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Food"); // Default category
  const [productImages, setProductImages] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Handles converting files to base64 for upload
  const filesToBase64 = (files) =>
    Promise.all(
      [...files].map(
        (file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (err) => reject(err);
          })
      )
    );

  const handleImagesChange = (e) => setProductImages([...e.target.files]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to add a product.");
      setLoading(false);
      return router.push("/Login");
    }

    // Basic form validation
    if (!productName || !description || !price || productImages.length === 0) {
      setMessage("Please fill all fields and upload at least one image.");
      setLoading(false);
      return;
    }

    try {
      const imagesBase64 = await filesToBase64(productImages);

      // Create a new product object to send to the API
      const productData = {
        name: productName,
        description,
        price: parseFloat(price),
        images: imagesBase64,
        ownerId: user.uid,
        ownerName: user.email.split("@")[0], // Using username from email
        contact: user.email, // Using email as a contact method
        category
      };

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });

      const data = await res.json();
      if (res.status === 201) {
        setMessage("Product added successfully!");
        // Clear form after successful submission
        setProductName("");
        setDescription("");
        setPrice("");
        setProductImages([]);
        router.push("/marketplace");
      } else {
        setMessage(data.error || "Something went wrong.");
      }
    } catch (err) {
      console.error("Error adding product:", err);
      setMessage("Server error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F1E9] p-4 md:p-10 flex justify-center">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-lg p-6 md:p-10">
        <h1 className="text-3xl font-bold text-[#4F200D] mb-8 text-center">Add a New Product</h1>

        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
          <label className="text-lg text-[#4F200D]">Product Name</label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF9A00]"
          />

          <label className="text-lg text-[#4F200D]">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF9A00]"
            rows="4"
          />

          <label className="text-lg text-[#4F200D]">Price (₹)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF9A00]"
          />

          <label className="text-lg text-[#4F200D]">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF9A00]"
          >
            <option value="Food">Food</option>
            <option value="Toys">Toys</option>
            <option value="Accessories">Accessories</option>
            <option value="Grooming">Grooming</option>
            <option value="Other">Other</option>
          </select>

          <label className="text-lg text-[#4F200D]">Product Images</label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleImagesChange}
            className="p-3 border rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#4F200D] file:text-white hover:file:bg-orange-500"
          />

          {productImages.length > 0 && (
            <div className="flex flex-wrap gap-2 text-sm text-[#4F200D]">
              Selected files: {productImages.map(img => img.name).join(", ")}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`mt-4 px-6 py-3 rounded-lg text-white font-bold transition ${
              loading ? "bg-gray-400 cursor-not-allowed" : "bg-[#4F200D] hover:bg-orange-500"
            }`}
          >
            {loading ? "Adding..." : "Add Product"}
          </button>

          {message && (
            <p className={`mt-2 text-center text-sm font-semibold ${
              message.includes("successfully") ? "text-green-600" : "text-red-600"
            }`}>
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}