import React, { useState } from 'react';
import { updateMilestone } from '../services/api';

const MilestoneUpdateForm = ({ projectId, milestoneId, initialData, onSuccess }) => {
    const [formData, setFormData] = useState({
        isCompleted: initialData?.isCompleted || false,
        completionDate: initialData?.completionDate || ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await updateMilestone(projectId, milestoneId, formData);
            setLoading(false);
            
            if (response.data && response.data.success) {
                if (onSuccess) {
                    onSuccess(response.data.data);
                }
            } else {
                setError(response.data.message || '更新失败');
            }
        } catch (error) {
            setLoading(false);
            setError(error.response?.data?.message || '更新失败，请稍后再试');
        }
    };

    return (
        <div className="milestone-form">
            <h3>更新里程碑状态</h3>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleSubmit}>
                <div className="form-group checkbox">
                    <label>
                        <input
                            type="checkbox"
                            name="isCompleted"
                            checked={formData.isCompleted}
                            onChange={handleChange}
                        />
                        标记为已完成
                    </label>
                </div>
                <div className="form-group">
                    <label htmlFor="completionDate">完成日期</label>
                    <input
                        type="date"
                        id="completionDate"
                        name="completionDate"
                        value={formData.completionDate}
                        onChange={handleChange}
                        disabled={!formData.isCompleted}
                    />
                </div>
                <button type="submit" disabled={loading}>
                    {loading ? '提交中...' : '更新'}
                </button>
            </form>
        </div>
    );
};

export default MilestoneUpdateForm; 