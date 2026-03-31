const Settings = require('../models/SettingsSchema');
const path = require('path');
const fs = require('fs');

const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Error fetching settings' });
  }
};

const updateSettings = async (req, res) => {
  try {
    const { company, billing, notifications } = req.body;
    const settings = await Settings.findOneAndUpdate(
      {},
      { company, billing, notifications },
      { new: true, upsert: true }
    );
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Error updating settings' });
  }
};

const testSmtp = async (req, res) => {
  try {
    const { smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure } = req.body;
    if (!smtpHost) {
      return res.json({ success: false, message: 'Adresse SMTP non fournie' });
    }
    
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort || 587,
      secure: smtpSecure || false,
      auth: smtpUser ? {
        user: smtpUser,
        pass: smtpPass,
      } : undefined,
      connectionTimeout: 5000,
    });
    
    await transporter.verify();
    res.json({ success: true, message: 'Connexion réussie' });
  } catch (error) {
    console.error('SMTP test error:', error);
    res.json({ success: false, message: 'Échec de connexion: ' + error.message });
  }
};

const uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier fourni' });
    }
    const logoUrl = `/uploads/${req.file.filename}`;
    await Settings.findOneAndUpdate(
      {},
      { 'company.logoUrl': logoUrl },
      { upsert: true }
    );
    res.json({ success: true, logoUrl });
  } catch (error) {
    console.error('Logo upload error:', error);
    res.status(500).json({ success: false, message: 'Error uploading logo' });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  testSmtp,
  uploadLogo,
};
