# Alert System - AWS Infrastructure
# Terraform configuration for production-grade deployment

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state storage (uncomment after creating S3 bucket)
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

  # Environment variables
  environment_variables = {
    NODE_ENV          = var.environment
    PORT              = tostring(var.container_port)
    DATABASE_URL      = module.rds.connection_string
    REDIS_URL         = module.elasticache.connection_string
    QUEUE_ENABLED     = "true"
    AWS_REGION        = var.aws_region
  }

  # Secrets (from SSM Parameter Store)
  secrets = {
    JWT_SECRET           = var.ssm_jwt_secret_arn
    VAPID_PRIVATE_KEY    = var.ssm_vapid_private_key_arn
    AIR_QUALITY_API_KEY  = var.ssm_air_quality_api_key_arn
  }

  depends_on = [module.rds, module.elasticache]
}

# RDS Module
module "rds" {
  source = "./modules/rds"

  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  ecs_security_group_id = module.ecs.security_group_id

  # Database configuration
  instance_class    = var.rds_instance_class
  allocated_storage = var.rds_allocated_storage
  database_name     = var.database_name
  master_username   = var.database_username
  multi_az          = var.environment == "prod" ? true : false
}

# ElastiCache Module
module "elasticache" {
  source = "./modules/elasticache"

  project_name          = var.project_name
  environment           = var.environment
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  ecs_security_group_id = module.ecs.security_group_id

  node_type       = var.elasticache_node_type
  num_cache_nodes = var.environment == "prod" ? 2 : 1
}

# EventBridge Module
module "eventbridge" {
  source = "./modules/eventbridge"

  project_name    = var.project_name
  environment     = var.environment
  aws_region      = var.aws_region
  account_id      = data.aws_caller_identity.current.account_id
  api_endpoint    = module.alb.dns_name
  ecs_cluster_arn = module.ecs.cluster_arn
}

# CloudWatch Module
module "cloudwatch" {
  source = "./modules/cloudwatch"

  project_name       = var.project_name
  environment        = var.environment
  ecs_cluster_name   = module.ecs.cluster_name
  ecs_service_name   = module.ecs.service_name
  alb_arn_suffix     = module.alb.arn_suffix
  rds_identifier     = module.rds.identifier
  alert_email        = var.alert_email
}
