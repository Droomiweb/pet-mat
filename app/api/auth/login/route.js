import { connectDB } from "@/app/lib/mongodb";
import Pet from "@/app/models/PetModel";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/app/lib/firebase"; // ✅ use existing initialized storage

export async function POST(req) {
  try {
    await connectDB();
    const formData = await req.formData();

    const petName = formData.get("petName");
    const petAge = formData.get("petAge");
    const petBreed = formData.get("petBreed");
    const certificate = formData.get("certificate");
    const petImages = formData.getAll("petImages");

    // Upload certificate
    const certBuffer = Buffer.from(await certificate.arrayBuffer());
    const certRef = ref(storage, `certificates/${Date.now()}-${certificate.name}`);
    await uploadBytes(certRef, certBuffer, { contentType: certificate.type });
    const certificateUrl = await getDownloadURL(certRef);

    // Upload each image
    const imageUrls = [];
    for (const img of petImages) {
      const imgBuffer = Buffer.from(await img.arrayBuffer());
      const imgRef = ref(storage, `pets/${Date.now()}-${img.name}`);
      await uploadBytes(imgRef, imgBuffer, { contentType: img.type });
      const url = await getDownloadURL(imgRef);
      imageUrls.push(url);
    }

    const newPet = new Pet({
      name: petName,
      age: parseInt(petAge),
      breed: petBreed,
      certificateUrl,
      imageUrls,
      ownerId: "some-owner-id", // TODO: replace with actual Firebase UID
    });

    await newPet.save();

    return new Response(JSON.stringify({ message: "Pet added successfully!" }), { status: 201 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
