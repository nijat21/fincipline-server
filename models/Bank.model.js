const { Schema, model } = require('mongoose');

const bankSchema = new Schema(
    {
        access_token: { type: String },
        user_id: { type: Schema.Types.ObjectId, ref: 'User' },
        institution_name: { type: String },
        institution_id: { type: String },
        accounts: [{ type: Schema.Types.ObjectId, ref: 'Account' }]
    },
    {
        // this second object adds extra properties: `createdAt` and `updatedAt`    
        timestamps: true
    }
);

module.exports = model('Bank', bankSchema);