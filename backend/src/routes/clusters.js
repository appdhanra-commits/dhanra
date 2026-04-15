import express from 'express';
import Cluster from '../models/Cluster.js';
import Customer from '../models/Customer.js';

const router = express.Router();

// Create a new cluster
router.post('/', async (req, res) => {
  try {
    const { name, description, businessApplicationId } = req.body;

    if (!name || !businessApplicationId) {
      return res.status(400).json({
        success: false,
        message: 'Cluster name and business application ID are required'
      });
    }

    const newCluster = new Cluster({
      name,
      description,
      businessApplicationId
    });

    await newCluster.save();

    res.status(201).json({
      success: true,
      message: 'Cluster created successfully',
      cluster: newCluster
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get all clusters for a business
router.get('/business/:businessApplicationId', async (req, res) => {
  try {
    const { businessApplicationId } = req.params;

    const clusters = await Cluster.find({ 
      businessApplicationId,
      status: 'active' 
    }).sort({ createdAt: -1 });

    // Calculate payment status for each cluster
    const clustersWithStats = await Promise.all(
      clusters.map(async (cluster) => {
        const customers = await Customer.find({ clusterId: cluster._id });
        const paidCount = customers.filter(c => c.status === 'paid').length;
        const pendingCount = customers.filter(c => c.status === 'pending').length;
        const overdueCount = customers.filter(c => c.status === 'overdue').length;

        return {
          ...cluster.toObject(),
          customerCount: customers.length,
          paidCount,
          pendingCount,
          overdueCount,
          statusText: pendingCount === 0 ? 'Fully Paid' : `${pendingCount} left`
        };
      })
    );

    res.status(200).json({
      success: true,
      clusters: clustersWithStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get cluster details with customers
router.get('/:clusterId', async (req, res) => {
  try {
    const { clusterId } = req.params;

    const cluster = await Cluster.findById(clusterId);
    if (!cluster) {
      return res.status(404).json({
        success: false,
        message: 'Cluster not found'
      });
    }

    const customers = await Customer.find({ clusterId })
      .sort({ createdAt: -1 });

    const paidCount = customers.filter(c => c.status === 'paid').length;
    const pendingCount = customers.filter(c => c.status === 'pending').length;
    const overdueCount = customers.filter(c => c.status === 'overdue').length;

    res.status(200).json({
      success: true,
      cluster: {
        ...cluster.toObject(),
        customerCount: customers.length,
        paidCount,
        pendingCount,
        overdueCount,
        statusText: pendingCount === 0 ? 'Fully Paid' : `${pendingCount} left`,
        customers
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

// Update cluster
router.put('/:clusterId', async (req, res) => {
  try {
    const { clusterId } = req.params;
    const { name, description, status } = req.body;

    const updatedCluster = await Cluster.findByIdAndUpdate(
      clusterId,
      { name, description, status },
      { new: true }
    );

    if (!updatedCluster) {
      return res.status(404).json({
        success: false,
        message: 'Cluster not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Cluster updated successfully',
      cluster: updatedCluster
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Delete cluster
router.delete('/:clusterId', async (req, res) => {
  try {
    const { clusterId } = req.params;

    // Check if cluster has customers
    const customerCount = await Customer.countDocuments({ clusterId });
    if (customerCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete cluster with existing customers'
      });
    }

    const deletedCluster = await Cluster.findByIdAndDelete(clusterId);
    if (!deletedCluster) {
      return res.status(404).json({
        success: false,
        message: 'Cluster not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Cluster deleted successfully'
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
