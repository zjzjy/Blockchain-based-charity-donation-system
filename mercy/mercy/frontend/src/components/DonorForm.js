import React, { useState } from 'react';
import { registerDonor } from '../services/api';

const DonorForm = ({ onSuccess }) => {
    const [formData, setFormData] = useState({
        donorId: '',
        name: '',
        email: '',
        phone: '',
        walletAddress: ''
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
            const response = await registerDonor(formData);
            setLoading(false);
            
            if (response.data && response.data.success) {
                if (onSuccess) {
                    onSuccess(response.data.data);
                }
                // 重置表单
                setFormData({
                    donorId: '',
                    name: '',
                    email: '',
                    phone: '',
                    walletAddress: ''
                });
            } else {
                setError(response.data.message || '注册失败');
            }
        } catch (error) {
            setLoading(false);
            setError(error.response?.data?.message || '注册失败，请稍后再试');
        }
    };

    return (
        <div className="donor-form">
            <h2>注册捐赠者</h2>
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
                    <label htmlFor="name">姓名</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="email">邮箱</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="phone">电话</label>
                    <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="walletAddress">钱包地址 (可选)</label>
                    <input
                        type="text"
                        id="walletAddress"
                        name="walletAddress"
                        value={formData.walletAddress}
                        onChange={handleChange}
                    />
                </div>
                <button type="submit" disabled={loading}>
                    {loading ? '提交中...' : '注册'}
                </button>
            </form>
        </div>
    );
};

export default DonorForm; 