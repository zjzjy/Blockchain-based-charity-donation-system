import React, { useState } from 'react';
import { createProject } from '../services/api';

const ProjectForm = ({ onSuccess }) => {
    const [formData, setFormData] = useState({
        projectId: '',
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        categories: '',
        totalFundingRequired: '',
        ownerId: ''
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
            // 处理categories，将字符串转换为数组
            const dataToSubmit = {
                ...formData,
                categories: formData.categories.split(',').map(item => item.trim()),
                totalFundingRequired: parseFloat(formData.totalFundingRequired)
            };

            const response = await createProject(dataToSubmit);
            setLoading(false);
            
            if (response.data && response.data.success) {
                if (onSuccess) {
                    onSuccess(response.data.data);
                }
                // 重置表单
                setFormData({
                    projectId: '',
                    name: '',
                    description: '',
                    startDate: '',
                    endDate: '',
                    categories: '',
                    totalFundingRequired: '',
                    ownerId: ''
                });
            } else {
                setError(response.data.message || '创建失败');
            }
        } catch (error) {
            setLoading(false);
            setError(error.response?.data?.message || '创建失败，请稍后再试');
        }
    };

    return (
        <div className="project-form">
            <h2>创建项目</h2>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleSubmit}>
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
                    <label htmlFor="name">项目名称</label>
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
                    <label htmlFor="description">项目描述</label>
                    <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        required
                    ></textarea>
                </div>
                <div className="form-group">
                    <label htmlFor="startDate">开始日期</label>
                    <input
                        type="date"
                        id="startDate"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="endDate">结束日期</label>
                    <input
                        type="date"
                        id="endDate"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="categories">分类 (以逗号分隔)</label>
                    <input
                        type="text"
                        id="categories"
                        name="categories"
                        value={formData.categories}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="totalFundingRequired">所需资金</label>
                    <input
                        type="number"
                        id="totalFundingRequired"
                        name="totalFundingRequired"
                        value={formData.totalFundingRequired}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="ownerId">项目所有者ID</label>
                    <input
                        type="text"
                        id="ownerId"
                        name="ownerId"
                        value={formData.ownerId}
                        onChange={handleChange}
                        required
                    />
                </div>
                <button type="submit" disabled={loading}>
                    {loading ? '提交中...' : '创建项目'}
                </button>
            </form>
        </div>
    );
};

export default ProjectForm; 