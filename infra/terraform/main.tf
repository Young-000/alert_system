# Alert System - AWS Infrastructure
# Terraform configuration for production-grade deployment

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  # Remote state storage
  # TODO: Enable after creating S3 bucket and DynamoDB table:
  #   aws s3api create-bucket --bucket alert-system-terraform-state --region ap-northeast-2 --create-bucket-configuration LocationConstraint=ap-northeast-2
  #   aws s3api put-bucket-versioning --bucket alert-system-terraform-state --versioning-configuration Status=Enabled
  #   aws dynamodb create-table --table-name terraform-locks --attribute-definitions AttributeName=LockID,AttributeType=S --key-schema AttributeName=LockID,KeyType=HASH --billing-mode PAY_PER_REQUEST
  # Then run: terraform init -migrate-state
  # backend "s3" {
  #   bucket         = "alert-system-terraform-state"
  #   key            = "prod/terraform.tfstate"
  #   region         = "ap-northeast-2"
  #   encrypt        = true
  #   dynamodb_table = "terraform-locks"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "alert-system"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  project_name       = var.project_name
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = slice(data.aws_availability_zones.available.names, 0, 2)
}

# ALB Module
module "alb" {
  source = "./modules/alb"

  project_name      = var.project_name
  environment       = var.environment
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  certificate_arn   = var.certificate_arn
}

# ECS Module
module "ecs" {
  source = "./modules/ecs"

  project_name          = var.project_name
  environment           = var.environment
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  alb_target_group_arn  = module.alb.target_group_arn
  alb_security_group_id = module.alb.security_group_id

  # Container configuration
  container_image = var.container_image
  container_port  = var.container_port
  cpu             = var.ecs_cpu
  memory          = var.ecs_memory
  desired_count   = var.ecs_desired_count

  # Environment variables (Supabase 사용, RDS/ElastiCache 비활성화)
  environment_variables = {
    NODE_ENV               = "production"
    PORT                   = tostring(var.container_port)
    USE_SQLITE             = "false"
    QUEUE_ENABLED          = "false"
    AWS_REGION             = var.aws_region
    AWS_ACCOUNT_ID         = data.aws_caller_identity.current.account_id
    AWS_SCHEDULER_ENABLED  = "true"
    SCHEDULE_GROUP_NAME    = module.eventbridge.schedule_group_name
    SCHEDULER_ROLE_ARN     = module.eventbridge.scheduler_role_arn
    SCHEDULER_DLQ_ARN      = module.eventbridge.dlq_arn
  }

  # Secrets (from SSM Parameter Store)
  # SSM ARN prefix for consistency
  secrets = {
    JWT_SECRET           = var.ssm_jwt_secret_arn
    VAPID_PRIVATE_KEY    = var.ssm_vapid_private_key_arn
    AIR_QUALITY_API_KEY  = var.ssm_air_quality_api_key_arn
    DATABASE_URL         = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project_name}/${var.environment}/database-url"
    SCHEDULER_SECRET     = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project_name}/${var.environment}/scheduler-secret"

    # Subway/Bus API
    SUBWAY_API_KEY       = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project_name}/${var.environment}/subway-api-key"

    # Solapi (Kakao Alimtalk)
    SOLAPI_API_KEY       = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project_name}/${var.environment}/solapi-api-key"
    SOLAPI_API_SECRET    = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project_name}/${var.environment}/solapi-api-secret"
    SOLAPI_PF_ID         = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project_name}/${var.environment}/solapi-pf-id"
    SOLAPI_TEMPLATE_ID   = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project_name}/${var.environment}/solapi-template-id"
  }
}

# RDS Module - 비활성화 (Supabase 사용)
# module "rds" { ... }

# ElastiCache Module - 비활성화 (비용 절감)
# module "elasticache" { ... }

# CloudFront Module
module "cloudfront" {
  source = "./modules/cloudfront"

  project_name = var.project_name
  environment  = var.environment
  alb_dns_name = module.alb.dns_name
}

# EventBridge Module
module "eventbridge" {
  source = "./modules/eventbridge"

  project_name      = var.project_name
  environment       = var.environment
  aws_region        = var.aws_region
  account_id        = data.aws_caller_identity.current.account_id
  api_endpoint      = module.alb.dns_name
  cloudfront_domain = var.cloudfront_domain
  ecs_cluster_arn   = module.ecs.cluster_arn
}

# CloudWatch Module
module "cloudwatch" {
  source = "./modules/cloudwatch"

  project_name       = var.project_name
  environment        = var.environment
  ecs_cluster_name   = module.ecs.cluster_name
  ecs_service_name   = module.ecs.service_name
  alb_arn_suffix     = module.alb.arn_suffix
  rds_identifier     = ""  # RDS 비활성화 (Supabase 사용)
  alert_email        = var.alert_email
}
