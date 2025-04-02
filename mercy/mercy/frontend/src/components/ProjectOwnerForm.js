import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { registerProjectOwner } from '../services/api';

const ProjectOwnerForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    try {
      setLoading(true);
      await registerProjectOwner(values);
      message.success('注册成功！');
      form.resetFields();
    } catch (error) {
      message.error('注册失败：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      style={{ maxWidth: 600, margin: '0 auto' }}
    >
      <Form.Item
        name="projectOwnerId"
        label="项目所有者ID"
        rules={[{ required: true, message: '请输入项目所有者ID' }]}
      >
        <Input placeholder="请输入项目所有者ID" />
      </Form.Item>

      <Form.Item
        name="name"
        label="姓名"
        rules={[{ required: true, message: '请输入姓名' }]}
      >
        <Input placeholder="请输入姓名" />
      </Form.Item>

      <Form.Item
        name="email"
        label="邮箱"
        rules={[
          { required: true, message: '请输入邮箱' },
          { type: 'email', message: '请输入有效的邮箱地址' }
        ]}
      >
        <Input placeholder="请输入邮箱" />
      </Form.Item>

      <Form.Item
        name="phone"
        label="电话"
        rules={[{ required: true, message: '请输入电话' }]}
      >
        <Input placeholder="请输入电话" />
      </Form.Item>

      <Form.Item
        name="address"
        label="地址"
        rules={[{ required: true, message: '请输入地址' }]}
      >
        <Input placeholder="请输入地址" />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          注册
        </Button>
      </Form.Item>
    </Form>
  );
};

export default ProjectOwnerForm; 