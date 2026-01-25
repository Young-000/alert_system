# EventBridge Module - Scheduler for Individual User Notifications

# IAM Role for EventBridge Scheduler
resource "aws_iam_role" "scheduler" {
  name = "${var.project_name}-${var.environment}-scheduler-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "scheduler.amazonaws.com"
        }
      }
    ]
  })
}

# Policy to invoke API Gateway / HTTP endpoints
resource "aws_iam_role_policy" "scheduler_invoke" {
  name = "${var.project_name}-${var.environment}-scheduler-invoke-policy"
  role = aws_iam_role.scheduler.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "states:StartExecution"
        ]
        Resource = "*"
      }
    ]
  })
}

# Schedule Group for organizing schedules
resource "aws_scheduler_schedule_group" "alerts" {
  name = "${var.project_name}-${var.environment}-alerts"

  tags = {
    Name = "${var.project_name}-${var.environment}-alert-schedules"
  }
}

# Dead Letter Queue for failed invocations
resource "aws_sqs_queue" "scheduler_dlq" {
  name = "${var.project_name}-${var.environment}-scheduler-dlq"

  message_retention_seconds = 1209600  # 14 days

  tags = {
    Name = "${var.project_name}-${var.environment}-scheduler-dlq"
  }
}

# CloudWatch alarm for DLQ messages
resource "aws_cloudwatch_metric_alarm" "dlq_messages" {
  alarm_name          = "${var.project_name}-${var.environment}-scheduler-dlq-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Alert when scheduler DLQ has messages"

  dimensions = {
    QueueName = aws_sqs_queue.scheduler_dlq.name
  }

  alarm_actions = []  # Add SNS topic ARN for notifications
}

# Store scheduler role ARN in SSM for application use
resource "aws_ssm_parameter" "scheduler_role_arn" {
  name        = "/${var.project_name}/${var.environment}/scheduler-role-arn"
  description = "EventBridge Scheduler role ARN"
  type        = "String"
  value       = aws_iam_role.scheduler.arn

  tags = {
    Name = "${var.project_name}-${var.environment}-scheduler-role-arn"
  }
}

resource "aws_ssm_parameter" "schedule_group_name" {
  name        = "/${var.project_name}/${var.environment}/schedule-group-name"
  description = "EventBridge Schedule Group name"
  type        = "String"
  value       = aws_scheduler_schedule_group.alerts.name

  tags = {
    Name = "${var.project_name}-${var.environment}-schedule-group-name"
  }
}

resource "aws_ssm_parameter" "dlq_arn" {
  name        = "/${var.project_name}/${var.environment}/scheduler-dlq-arn"
  description = "Scheduler DLQ ARN"
  type        = "String"
  value       = aws_sqs_queue.scheduler_dlq.arn

  tags = {
    Name = "${var.project_name}-${var.environment}-scheduler-dlq-arn"
  }
}
