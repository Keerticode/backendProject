/*
import { v2 as cloudinary } from 'cloudinary'
import fs from "fs"

console.log("ENV CHECK:", {
    cloud: process.env.CLOUDINARY_CLOUD_NAME,
    key: process.env.CLOUDINARY_API_KEY,
    secret: process.env.CLOUDINARY_API_SECRET
});


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        console.log("Uploading file:", localFilePath);
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        console.log("Cloudinary response:", response);
        //file has been uploaded successfully
        console.log("file is uploded on cloudinary", response.url);
        return response
    } catch (error) {
        console.log("Cloudinary ERROR:", error);
        fs.unlinkSync(localFilePath);
        return null;
    }
}

export { uploadOnCloudinary }
*/






import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

//Configure cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
console.log("ENV RAW:", process.env.CLOUDINARY_CLOUD_NAME);
const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            console.log("No file path provided");
            return null;
        }

        //Convert Windows path (\) → Unix (/)
        const fixedPath = localFilePath.replace(/\\/g, "/");

        console.log("Uploading file:", fixedPath);
        console.log("File exists:", fs.existsSync(localFilePath));

        //Upload to cloudinary
        const response = await cloudinary.uploader.upload(fixedPath, {
            resource_type: "auto"
        });

        console.log("File uploaded:", response.url);

        // Delete local file after success
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }

        return response;

    } catch (error) {
        console.log("Cloudinary ERROR:", error);

        //Clean up file even on failure
        if (localFilePath && fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }

        return null;
    }
};

export { uploadOnCloudinary };