import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request) {
  try {
    await requireAdmin();
    
    const formData = await request.formData();
    const file = formData.get("file");
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "oats_and_co/items" },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    return NextResponse.json({ success: true, url: uploadResult.secure_url }, { status: 200 });

  } catch (error) {
    console.error("Upload Error:", error);
    if (error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
