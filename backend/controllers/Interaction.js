const Interaction = require('../models/InteractionSchema');

const getAllInteractions = async (req, res) => {
  try {
    const { clientId, userId, type } = req.query;
    let query = {};

    if (clientId) query.clientId = clientId;
    if (userId) query.userId = userId;
    if (type) query.type = type;

    const interactions = await Interaction.find(query)
      .populate('clientId', 'companyName email')
      .populate('userId', 'name email')
      .sort({ date: -1 });
    res.status(200).json(interactions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getInteractionById = async (req, res) => {
  try {
    const interaction = await Interaction.findById(req.params.id)
      .populate('clientId', 'companyName email phone')
      .populate('userId', 'name email role');
    if (!interaction) {
      return res.status(404).json({ message: 'Interaction not found' });
    }
    res.status(200).json(interaction);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createInteraction = async (req, res) => {
  try {
    const interaction = new Interaction(req.body);
    await interaction.save();
    const populatedInteraction = await Interaction.findById(interaction._id)
      .populate('clientId', 'companyName email')
      .populate('userId', 'name email');
    res.status(201).json({ message: 'Interaction created successfully', interaction: populatedInteraction });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateInteraction = async (req, res) => {
  try {
    const interaction = await Interaction.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('clientId', 'companyName email')
      .populate('userId', 'name email');
    if (!interaction) {
      return res.status(404).json({ message: 'Interaction not found' });
    }
    res.status(200).json({ message: 'Interaction updated successfully', interaction });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteInteraction = async (req, res) => {
  try {
    const interaction = await Interaction.findByIdAndDelete(req.params.id);
    if (!interaction) {
      return res.status(404).json({ message: 'Interaction not found' });
    }
    res.status(200).json({ message: 'Interaction deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllInteractions,
  getInteractionById,
  createInteraction,
  updateInteraction,
  deleteInteraction
};
