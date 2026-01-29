# EventBridge Module - Scheduler for Individual User Notifications

# Random password for scheduler secret
resource "random_password" "scheduler_secret" {
  length  = 32
  special = false
}

# Store scheduler secret in SSM
resource "aws_ssm_parameter" "scheduler_secret" {
  name        = "/${var.project_name}/${var.environment}/scheduler-secret"
  description = "Secret for authenticating EventBridge Scheduler callbacks"
  type        = "SecureString"
  value       = random_password.scheduler_secret.result

  tags = {
    Name = "${var.project_name}-${var.environment}-scheduler-secret"
  }
}

# EventBridge Connection (authentication for API calls)
resource "aws_cloudwatch_event_connection" "scheduler" {
  name               = "${var.project_name}-${var.environment}-scheduler-connection"
  description        = "Connection for EventBridge Scheduler to call backend API"
  authorization_type = "API_KEY"

  auth_parameters {
    api_key {
      key   = "x-scheduler-secret"
      value = random_password.scheduler_secret.result
    }
  }
}

# API Destination (HTTP endpoint for scheduler to call)
resource "aws_cloudwatch_event_api_destination" "scheduler" {
  name                             = "${var.project_name}-${var.environment}-scheduler-api"
  description                      = "API destination for scheduler trigger endpoint"
  invocation_endpoint              = "https://${var.cloudfront_domain}/scheduler/trigger"
  http_method                      = "POST"
  invocation_rate_limit_per_second = 50
  connection_arn                   = aws_cloudwatch_event_connection.scheduler.arn
}

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

# Policy to put events to EventBridge (Scheduler → Event Bus)
resource "aws_iam_role_policy" "scheduler_put_events" {
  name = "${var.project_name}-${var.environment}-scheduler-put-events-policy"
  role = aws_iam_role.scheduler.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "events:PutEvents"
        ]
        Resource = "arn:aws:events:${var.aws_region}:${var.account_id}:event-bus/default"
      }
    ]
  })
}

# EventBridge Rule to route scheduler events to API Destination
resource "aws_cloudwatch_event_rule" "scheduler_to_api" {
  name        = "${var.project_name}-${var.environment}-scheduler-route"
  description = "Routes scheduler events to API Destination"

  event_pattern = jsonencode({
    source      = ["${var.project_name}.scheduler"]
    detail-type = ["ScheduledNotification"]
  })
}

# Target: API Destination
resource "aws_cloudwatch_event_target" "api_destination" {
  rule      = aws_cloudwatch_event_rule.scheduler_to_api.name
  target_id = "api-destination"
  arn       = aws_cloudwatch_event_api_destination.scheduler.arn
  role_arn  = aws_iam_role.events_api_destination.arn

  # Transform the event to extract alertId from detail
  input_transformer {
    input_paths = {
      alertId    = "$.detail.alertId"
      userId     = "$.detail.userId"
      alertTypes = "$.detail.alertTypes"
    }
    input_template = <<EOF
{
  "alertId": <alertId>,
  "userId": <userId>,
  "alertTypes": <alertTypes>
}
EOF
  }
}

# IAM Role for EventBridge Rule to invoke API Destination
resource "aws_iam_role" "events_api_destination" {
  name = "${var.project_name}-${var.environment}-events-api-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "events_invoke_api" {
  name = "${var.project_name}-${var.environment}-events-invoke-api-policy"
  role = aws_iam_role.events_api_destination.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "events:InvokeApiDestination"
        ]
        Resource = aws_cloudwatch_event_api_destination.scheduler.arn
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
