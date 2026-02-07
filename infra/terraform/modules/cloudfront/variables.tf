variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment (prod, staging, dev)"
  type        = string
}

variable "alb_dns_name" {
  description = "ALB DNS name to use as origin"
  type        = string
}
