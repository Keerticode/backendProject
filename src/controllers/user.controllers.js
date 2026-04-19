import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/users.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

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

   if (!username || !email) {
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

})

export { registerUser, }