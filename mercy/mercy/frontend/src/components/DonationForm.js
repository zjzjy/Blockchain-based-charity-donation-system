import React, { useState } from 'react';
import { makeDonation } from '../services/api';

const DonationForm = ({ onSuccess }) => {
    const [formData, setFormData] = useState({
        donorId: '',
        projectId: '',
        amount: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const dataToSubmit = {
                ...formData,
                amount: parseFloat(formData.amount)
            };

            const response = await makeDonation(dataToSubmit);
            setLoading(false);
            
            if (response.data && response.data.success) {
                if (onSuccess) {
                    onSuccess(response.data.data);
                }
                // 重置表单
                setFormData({
                    donorId: '',
                    projectId: '',
                    amount: ''
                });
            } else {
                setError(response.data.message || '捐赠失败');
            }
        } catch (error) {
            setLoading(false);
            setError(error.response?.data?.message || '捐赠失败，请稍后再试');
        }
    };

    return (
        <div className="donation-form">
            <h2>捐赠</h2>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="donorId">捐赠者ID</label>
                    <input
                        type="text"
                        id="donorId"
                        name="donorId"
                        value={formData.donorId}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="projectId">项目ID</label>
                    <input
                        type="text"
                        id="projectId"
                        name="projectId"
                        value={formData.projectId}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="amount">捐赠金额</label>
                    <input
                        type="number"
                        id="amount"
                        name="amount"
                        value={formData.amount}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        required
                    />
                </div>
                <button type="submit" disabled={loading}>
                    {loading ? '提交中...' : '捐赠'}
                </button>
            </form>
        </div>
    );
};

export default DonationForm; 