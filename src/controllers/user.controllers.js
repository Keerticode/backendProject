import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/users.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"


const generateAccessAndRefreshTokens = async (userId) => {
   try {
      const user = await User.findById(userId);
      const accessToken = user.generateAcessToken();
      const refreshToken = user.generateRefreshToken();

      user.refreshToken = refreshToken
      await user.save({ validateBeforeSave: false })

      return { accessToken, refreshToken }

   } catch (error) {
      throw new ApiError(500, "Something went wrong while generating refresh and access token");
   }
}

const registerUser = asyncHandler(async (req, res) => {
   console.log("entered register controller")
   //get user detail from frontend
   //validation - not empty
   //check if user already exist - through email , username
   //check for images,check for avatar
   //upload them to cloudinary, avatar
   //cretae user object -- create entry in db
   //remove password and refresh token field from response
   //check for user creation
   //return response

   console.log("Files : ", req.files);
   console.log("BODY : ", req.body);
   const { fullname, email, username, password } = req.body;
   console.log("email :", email)

   /*
   if(fullName === ""){
      throw new ApiError(400,"full name is required")
   }
   */

   if (
      [fullname, email, username, password].some((field) => field?.trim() === "")
   ) {
      throw new ApiError(400, "All fields are compulsory required")
   }

   const existedUser = await User.findOne({
      $or: [{ username }, { email }]
   })

   if (existedUser) {
      throw new ApiError(409, "User with email or username already exists")
   }

   const avatarLocalPath = req.files?.avatar?.[0]?.path;
   //const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

   let coverImageLocalPath;
   if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
      coverImageLocalPath = req.files.coverImage[0].path
   }

   if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar file is required")
   }

   const avatar = await uploadOnCloudinary(avatarLocalPath)
   console.log("avatarLocalPath:", avatarLocalPath);
   const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : null;

   if (!avatar) {
      throw new ApiError(400, "Avatar file is required")
   }

   const user = await User.create({
      fullname,
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
      email,
      password,
      username: username.toLowerCase()
   })

   const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
   );

   if (!createdUser) {
      throw new ApiError(500, "Something went wrong while registering the user")
   }

   return res.json(
      new ApiResponse(200, createdUser, "User registered successfully")
   )
})

const loginUser = asyncHandler(async (req, res) => {

   // req body -> data
   // get the username or email
   // find the user
   // match it with already existing hash password
   // password check
   // access token and refresh token 
   // send cookies

   const { email, username, password } = req.body
   console.log(email);

   if (!(username || !email)) {
      throw new ApiError(400, "username or email is required")
   }

   const user = await User.findOne({
      $or: [{ username }, { email }]
   })

   if (!user) {
      throw new ApiError(404, "User does not exist")
   }

   const isPasswordValid = await user.isPasswordCorrect(password)
   if (!isPasswordValid) {
      throw new ApiError(401, "Invalid user credentials");
   }

   const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

   const loggedinUser = await User.findById(user._id).select("-password -refreshToken");

   const options = {
      httpOnly: true,
      secure: true
   }

   return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
         new ApiResponse(
            200,
            {
               user: loggedinUser, accessToken, refreshToken
            },
            "User logged in Successfully"
         )
      )

})

const logoutUser = asyncHandler(async (req, res) => {
   await User.findByIdAndUpdate(
      req.user._id,
      {
         $set: {
            refreshToken: undefined
         }
      },
      {
         new: true
      }
   )

   const options = {
      httpOnly: true,
      secure: true
   }

   return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, {}, "user logged out succesfully"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
   const incomingrefreshToken = req.cookies.refreshToken || req.body.refreshToken

   if (!refreshAccessToken) {
      throw new ApiError(401, "unauthorized request")
   }

   try {
      const decodedToken = jwt.verify(
         incomingrefreshToken,
         process.env.REFRESH_TOKEN_SECRET
      )

      const user = await User.findById(decodedToken?._id)

      if (!user) {
         throw new ApiError(401, "Invalid refresh token");
      }

      if (incomingrefreshToken != user?.refreshToken) {
         throw new ApiError(401, "Refresh token is expired or used")
      }

      const options = {
         httpOnly: true,
         secure: true
      }

      const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)

      return res
         .status(200)
         .cookie("accessToken", accessToken, options)
         .cookie("refreshtoken", newRefreshToken, options)
         .json(
            new ApiResponse(
               200,
               { accessToken, refreshToken: newRefreshToken },
               "Access token refreshed"
            )
         )

   } catch (error) {
      throw new ApiError(401, error?.message || "Invalid refresh token")
   }

})


export {
   registerUser,
   loginUser,
   logoutUser,
   refreshAccessToken
}