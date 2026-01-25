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
