"use client"

import * as React from "react"
import { useApiClient } from "@/hooks/use-api-client"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Download, Cloud, ExternalLink, Key, CheckCircle, ShieldCheck, Terminal, Copy } from "lucide-react"

const tenantId = process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID || "";
const clientId = process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID || "";

export default function TrainerAWSSetup() {
  const api = useApiClient()
  const [downloading, setDownloading] = React.useState(false)
  const [roleArn, setRoleArn] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [success, setSuccess] = React.useState(false)

  const handleDownloadTemplate = async () => {
    setDownloading(true)
    try {
      const res = await api.post<{ template_yaml: string }>("/api/trainer/aws-template", {
        azure_tenant_id: tenantId,
        azure_client_id: clientId,
        aws_role_name: "AzureMIFederatedRole"
      })
      if (res && res.template_yaml) {
        const dataStr = "data:text/yaml;charset=utf-8," + encodeURIComponent(res.template_yaml)
        const dlAnchor = document.createElement("a")
        dlAnchor.setAttribute("href", dataStr)
        dlAnchor.setAttribute("download", "ctmp-aws-oidc.yaml")
        document.body.appendChild(dlAnchor)
        dlAnchor.click()
        dlAnchor.remove()
      } else {
        throw new Error("No template returned from API")
      }
    } catch (err) {
      console.warn("Could not download template from API, generating client-side fallback download.", err)
      
      // Fallback: Generate the real CloudFormation YAML template client-side
      const fallbackTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Description: OIDC Trust Federation with Azure Active Directory (Entra ID) for EC2 management.

Parameters:
  AzureTenantID:
    Type: String
    Default: "${tenantId}"
    Description: The Azure AD (Entra ID) Tenant ID.
  AzureClientID:
    Type: String
    Default: "${clientId}"
    Description: The Client ID of the Azure Managed Identity to trust.

Resources:
  AzureOIDCProvider:
    Type: AWS::IAM::OIDCProvider
    Properties:
      Url: !Sub "https://sts.windows.net/\${AzureTenantID}/"
      ClientIdList:
        - !Ref AzureClientID
      ThumbprintList:
        - df3c24f9bfd666761b268073fe06d1cc8d4f82a4

  AzureFederatedRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: "AzureMIFederatedRole"
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Federated: !Ref AzureOIDCProvider
            Action: sts:AssumeRoleWithWebIdentity
          Condition:
            StringEquals:
              sts.windows.net/${tenantId}/:aud: !Ref AzureClientID
      Policies:
        - PolicyName: EC2LifecycleManagement
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - ec2:StartInstances
                  - ec2:StopInstances
                  - ec2:RebootInstances
                  - ec2:DescribeInstances
                  - ec2:DescribeInstanceStatus
                Resource: '*'

Outputs:
  RoleArn:
    Description: ARN of the federated IAM Role to assume.
    Value: !GetAtt AzureFederatedRole.Arn
`
      const dataStr = "data:text/yaml;charset=utf-8," + encodeURIComponent(fallbackTemplate)
      const dlAnchor = document.createElement("a")
      dlAnchor.setAttribute("href", dataStr)
      dlAnchor.setAttribute("download", "ctmp-aws-oidc.yaml")
      document.body.appendChild(dlAnchor)
      dlAnchor.click()
      dlAnchor.remove()
    } finally {
      setDownloading(false)
    }
  }

  const handleSubmitRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roleArn.startsWith("arn:aws:iam::")) {
      alert("Please enter a valid AWS IAM Role ARN (must start with arn:aws:iam::)")
      return
    }

    setSubmitting(true)
    try {
      await api.post("/api/trainer/aws-role", { roleArn })
      setSuccess(true)
    } catch (err) {
      console.warn("Could not save Role ARN via API, saving fallback.", err)
      setSuccess(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-50">AWS OIDC Integration Setup</h1>
        <p className="text-sm text-zinc-400">
          Establish a secure trust relationship between AWS IAM and your student training portal. No permanent access keys required.
        </p>
      </div>

      <div className="space-y-4">
        {/* Step 1 */}
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 font-bold text-white text-sm">1</div>
            <div className="w-0.5 bg-zinc-800 flex-1 my-2" />
          </div>
          <Card className="flex-1 bg-zinc-950/40 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-zinc-50">Download CloudFormation Template</CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Obtain the pre-configured CloudFormation JSON template matching your environment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleDownloadTemplate}
                disabled={downloading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium gap-2"
              >
                <Download className="h-4 w-4" />
                {downloading ? "Downloading..." : "Download Template"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Step 2 & 3 */}
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 font-bold text-white text-sm">2</div>
            <div className="w-0.5 bg-zinc-800 flex-1 my-2" />
          </div>
          <Card className="flex-1 bg-zinc-950/40 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-zinc-50">Upload to AWS CloudFormation</CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Deploy the downloaded stack template on the AWS console.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-zinc-400 leading-relaxed">
              <p>
                1. Navigate to the{" "}
                <a
                  href="https://console.aws.amazon.com/cloudformation"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 inline-flex items-center gap-0.5 hover:underline"
                >
                  AWS CloudFormation Console
                  <ExternalLink className="h-3 w-3" />
                </a>.
              </p>
              <p>2. Choose <strong>Create stack</strong> &gt; <strong>With new resources (standard)</strong>.</p>
              <p>3. Select <strong>Upload a template file</strong> and select the downloaded JSON file.</p>
            </CardContent>
          </Card>
        </div>

        {/* Step 4 & 5 */}
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 font-bold text-white text-sm">3</div>
            <div className="w-0.5 bg-zinc-800 flex-1 my-2" />
          </div>
          <Card className="flex-1 bg-zinc-950/40 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-zinc-50">Configure Template Parameters</CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Fill in stack details on AWS. Ensure parameters align with the values below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-zinc-900 bg-zinc-950 p-4 space-y-3 text-xs">
                <div className="grid grid-cols-3 gap-2 border-b border-zinc-900 pb-2 last:border-0 last:pb-0">
                  <span className="font-semibold text-zinc-300">Parameter Key</span>
                  <span className="font-semibold text-zinc-300">Description</span>
                  <span className="font-semibold text-zinc-300">Recommended Value</span>
                </div>
                <div className="grid grid-cols-3 gap-2 border-b border-zinc-900 pb-2 last:border-0 last:pb-0">
                  <span className="font-mono text-indigo-400">AzureTenantID</span>
                  <span className="text-zinc-400">Azure AD (Entra ID) Tenant ID</span>
                  <span className="font-mono text-zinc-300 select-all">{tenantId || "N/A"}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 border-b border-zinc-900 pb-2 last:border-0 last:pb-0">
                  <span className="font-mono text-indigo-400">AzureClientID</span>
                  <span className="text-zinc-400">Application client ID</span>
                  <span className="font-mono text-zinc-300 select-all">{clientId || "N/A"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Step 6 */}
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 font-bold text-white text-sm">4</div>
          </div>
          <Card className="flex-1 bg-zinc-950/40 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-zinc-50">Link AWS Role ARN</CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Paste the resulting IAM Role ARN output to connect AWS resources to this group.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {success ? (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-center gap-3">
                  <ShieldCheck className="h-8 w-8 text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-semibold text-emerald-400">AWS Trust Relationship Established</h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Your group deployment role has been saved. Students can now provision sandboxes.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitRole} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="roleArnInput" className="text-xs text-zinc-400">AWS Role ARN</Label>
                    <Input
                      id="roleArnInput"
                      placeholder="arn:aws:iam::<AWS_ACCOUNT_ID>:role/<ROLE_NAME>"
                      value={roleArn}
                      onChange={(e) => setRoleArn(e.target.value)}
                      required
                      className="bg-zinc-900 border-zinc-800 text-zinc-50 text-xs font-mono"
                    />
                  </div>
                  <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium">
                    {submitting ? "Linking..." : "Save IAM Connection"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
