# Outputs

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = module.alb.dns_name
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = module.ecs.service_name
}

# RDS 비활성화 (Supabase 사용)
# output "rds_endpoint" { ... }

# ElastiCache 비활성화 (비용 절감)
# output "redis_endpoint" { ... }

output "scheduler_role_arn" {
  description = "EventBridge Scheduler role ARN"
  value       = module.eventbridge.scheduler_role_arn
}

output "schedule_group_name" {
  description = "EventBridge Schedule Group name"
  value       = module.eventbridge.schedule_group_name
}

output "cloudwatch_dashboard_url" {
  description = "CloudWatch Dashboard URL"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${module.cloudwatch.dashboard_name}"
}
