const { Schema, model } = require('mongoose');

const accountSchema = new Schema(
    {
        access_token: { type: String },
        bank_id: { type: Schema.Types.ObjectId, ref: 'Bank' },
        user_id: { type: Schema.Types.ObjectId, ref: 'User' },
        institution_name: { type: String },
        institution_id: { type: String },
        account_mask: { type: String },
        acc_type: String,
        acc_subtype: String
    },
    {
        // this second object adds extra properties: `createdAt` and `updatedAt`    
        timestamps: true
    }
);

module.exports = model('Account', accountSchema);