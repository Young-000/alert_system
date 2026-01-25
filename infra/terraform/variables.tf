# Alert System - Terraform Variables

# General
variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "alert-system"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-2"  # Seoul
}

# VPC
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# ECS
variable "container_image" {
  description = "Docker image for ECS task"
  type        = string
}

variable "container_port" {
  description = "Container port"
  type        = number
  default     = 3000
}

variable "ecs_cpu" {
  description = "ECS task CPU units"
  type        = number
  default     = 512  # 0.5 vCPU
}

variable "ecs_memory" {
  description = "ECS task memory (MB)"
  type        = number
  default     = 1024  # 1 GB
}

variable "ecs_desired_count" {
  description = "Number of ECS tasks"
  type        = number
  default     = 2
}

# RDS
variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "rds_allocated_storage" {
  description = "RDS allocated storage (GB)"
  type        = number
  default     = 20
}

variable "database_name" {
  description = "Database name"
  type        = string
  default     = "alert_system"
}

variable "database_username" {
  description = "Database master username"
  type        = string
  default     = "alert_admin"
}

# ElastiCache
variable "elasticache_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t4g.micro"
}

# SSL Certificate
variable "certificate_arn" {
  description = "ACM certificate ARN for HTTPS"
  type        = string
  default     = ""  # Optional: provide for HTTPS
}

# SSM Parameter Store ARNs for secrets
variable "ssm_jwt_secret_arn" {
  description = "SSM Parameter Store ARN for JWT secret"
  type        = string
}

variable "ssm_vapid_private_key_arn" {
  description = "SSM Parameter Store ARN for VAPID private key"
  type        = string
}

variable "ssm_air_quality_api_key_arn" {
  description = "SSM Parameter Store ARN for Air Quality API key"
  type        = string
}

# Monitoring
variable "alert_email" {
  description = "Email for CloudWatch alerts"
  type        = string
}
