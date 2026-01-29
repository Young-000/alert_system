variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "account_id" {
  type = string
}

variable "api_endpoint" {
  type        = string
  description = "API endpoint URL (ALB DNS name)"
}

variable "cloudfront_domain" {
  type        = string
  description = "CloudFront distribution domain for HTTPS API calls"
}

variable "ecs_cluster_arn" {
  type = string
}
