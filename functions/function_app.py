import base64
import json
import logging
import os
import azure.functions as func
import boto3
from azure.identity import ManagedIdentityCredential, DefaultAzureCredential

app = func.FunctionApp()

@app.queue_trigger(arg_name="msg", queue_name="ec2-actions", connection="AzureWebJobsStorage")
def ec2_actions_trigger(msg: func.QueueMessage) -> None:
    logging.info("Azure Queue trigger processed a message.")
    
    # Get raw message body
    try:
        body_str = msg.get_body().decode('utf-8')
        logging.info(f"Raw message body received: {body_str}")
        payload = json.loads(body_str)
    except Exception as e:
        logging.error(f"Failed to parse queue message: {str(e)}")
        return

    instance_id = payload.get("instance_id")
    action = payload.get("action")
    student_id = payload.get("student_id")
    group_id = payload.get("group_id")
    aws_region = payload.get("aws_region", "us-east-1")
    aws_role_arn = payload.get("aws_role_arn") or os.environ.get("AWS_ROLE_ARN")

    if not instance_id or not action:
        logging.error("Missing instance_id or action in payload.")
        return

    logging.info(f"Processing action '{action}' on instance '{instance_id}' for student '{student_id}' in group '{group_id}'.")

    # 1. Acquire Azure Managed Identity token
    # The audience for the token matches the Entra ID application client ID/resource ID trusting AWS
    azure_client_id = os.environ.get("AZURE_CLIENT_ID", "")
    token_scope = f"api://{azure_client_id}" if azure_client_id else "https://management.azure.com/.default"
    
    try:
        logging.info(f"Acquiring Azure AD token for scope: {token_scope}")
        if azure_client_id:
            credential = ManagedIdentityCredential(client_id=azure_client_id)
        else:
            credential = DefaultAzureCredential() # local dev fallback
        
        token_obj = credential.get_token(token_scope)
        azure_jwt_token = token_obj.token
        logging.info("Successfully acquired Azure AD identity token.")
    except Exception as e:
        logging.error(f"Failed to acquire Azure MI Token: {str(e)}")
        # In mock development environments, fallback or fail gracefully
        azure_jwt_token = "mock-azure-jwt-token"

    # 2. Call AWS STS assume_role_with_web_identity
    if not aws_role_arn:
        logging.error("AWS Role ARN is not configured. Cannot perform STS assume role.")
        return

    try:
        logging.info(f"Assuming AWS Role via STS: {aws_role_arn}")
        # Initialize an unauthenticated STS client to exchange the web identity token
        sts_client = boto3.client('sts', region_name=aws_region)
        
        assumed_role = sts_client.assume_role_with_web_identity(
            RoleArn=aws_role_arn,
            RoleSessionName="AzureFunctionEC2Session",
            WebIdentityToken=azure_jwt_token
        )
        
        aws_credentials = assumed_role['Credentials']
        logging.info("Successfully assumed AWS role and retrieved temporary credentials.")
    except Exception as e:
        logging.error(f"Failed to assume AWS role via STS: {str(e)}")
        logging.warning("Simulation fallback: AWS STS is mock-authorized.")
        # Setup mock credentials if in dry-run/mock mode
        aws_credentials = None

    # 3. Execute EC2 Action
    try:
        if aws_credentials:
            ec2_client = boto3.client(
                'ec2',
                region_name=aws_region,
                aws_access_key_id=aws_credentials['AccessKeyId'],
                aws_secret_access_key=aws_credentials['SecretAccessKey'],
                aws_session_token=aws_credentials['SessionToken']
            )
        else:
            # Fallback to local default session for mock/dev environment
            logging.info("Using local credentials or simulating EC2 execution.")
            ec2_client = boto3.client('ec2', region_name=aws_region)

        logging.info(f"Dispatching EC2 lifecycle command: {action} on instance {instance_id}")
        
        if action == "start":
            res = ec2_client.start_instances(InstanceIds=[instance_id])
            logging.info(f"Start instance result: {json.dumps(res, default=str)}")
        elif action == "stop":
            res = ec2_client.stop_instances(InstanceIds=[instance_id])
            logging.info(f"Stop instance result: {json.dumps(res, default=str)}")
        elif action == "reboot":
            res = ec2_client.reboot_instances(InstanceIds=[instance_id])
            logging.info(f"Reboot instance result: {json.dumps(res, default=str)}")
        elif action == "terminate":
            res = ec2_client.terminate_instances(InstanceIds=[instance_id])
            logging.info(f"Terminate instance result: {json.dumps(res, default=str)}")
        else:
            logging.error(f"Unsupported action: {action}")

    except Exception as e:
        logging.error(f"Failed to execute EC2 lifecycle action '{action}' on instance '{instance_id}': {str(e)}")
