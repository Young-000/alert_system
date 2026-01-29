output "scheduler_role_arn" {
  value = aws_iam_role.scheduler.arn
}

output "schedule_group_name" {
  value = aws_scheduler_schedule_group.alerts.name
}

output "dlq_arn" {
  value = aws_sqs_queue.scheduler_dlq.arn
}

output "dlq_url" {
  value = aws_sqs_queue.scheduler_dlq.url
}

output "api_destination_arn" {
  value = aws_cloudwatch_event_api_destination.scheduler.arn
}

output "scheduler_secret_parameter" {
  value = aws_ssm_parameter.scheduler_secret.name
}
