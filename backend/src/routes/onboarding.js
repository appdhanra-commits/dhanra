import express from 'express';
import BusinessApplication from '../models/BusinessApplication.js';
import Cluster from '../models/Cluster.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Step 1: Account Creation
router.post('/account', async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    // Check if user already exists
    const existingUser = await BusinessApplication.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Account with this email or phone already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new business application
    const newApplication = new BusinessApplication({
      email,
      phone,
      password: hashedPassword,
      status: 'pending'
    });

    await newApplication.save();

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      applicationId: newApplication._id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Step 2: Profile and Business Setup
router.post('/profile', async (req, res) => {
  try {
    const { 
      applicationId, 
      fullName, 
      address, 
      businessType, 
      payoutMethod, 
      upiId, 
      bankAccountNumber, 
      bankIfsc 
    } = req.body;

    // Validate required fields
    if (!fullName || !address || !businessType || !payoutMethod) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    // Validate payout method specific fields
    if (payoutMethod === 'upi' && !upiId) {
      return res.status(400).json({
        success: false,
        message: 'UPI ID is required when UPI is selected as payout method'
      });
    }

    if (payoutMethod === 'bank' && (!bankAccountNumber || !bankIfsc)) {
      return res.status(400).json({
        success: false,
        message: 'Bank account details are required when Bank is selected as payout method'
      });
    }

    // Update application
    const updatedApplication = await BusinessApplication.findByIdAndUpdate(
      applicationId,
      {
        fullName,
        address,
        businessType,
        payoutMethod,
        ...(upiId && { upiId }),
        ...(bankAccountNumber && { bankAccountNumber }),
        ...(bankIfsc && { bankIfsc })
      },
      { new: true }
    );

    if (!updatedApplication) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      application: updatedApplication
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Step 3: Submit for Verification
router.post('/submit', async (req, res) => {
  try {
    const { applicationId } = req.body;

    const application = await BusinessApplication.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check if all required fields are filled
    if (!application.fullName || !application.address || !application.businessType) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required fields before submitting'
      });
    }

    // Update status to pending verification
    const updatedApplication = await BusinessApplication.findByIdAndUpdate(
      applicationId,
      { 
        status: 'pending',
        verificationMessage: 'Your account is under review and may take 24-48 hours for verification.'
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Application submitted for verification',
      verificationMessage: updatedApplication.verificationMessage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get application status
router.get('/status/:applicationId', async (req, res) => {
  try {
    const { applicationId } = req.params;

    const application = await BusinessApplication.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.status(200).json({
      success: true,
      application: {
        id: application._id,
        email: application.email,
        status: application.status,
        verificationMessage: application.verificationMessage,
        businessType: application.businessType
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

export default router;
